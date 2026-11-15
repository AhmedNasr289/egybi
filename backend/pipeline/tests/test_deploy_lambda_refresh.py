"""backend/ops/deploy_lambda_refresh.py: the parts that can go wrong without AWS.

A fake boto3 session records every call, so these run in CI with no AWS
account and no botocore installed.
"""
from __future__ import annotations

import io
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "ops"))

import deploy_lambda_refresh as dl  # noqa: E402


class NoSuchEntity(Exception):
    pass


class NotFound(Exception):
    pass


class FakeClient:
    def __init__(self, name, calls, kwargs, missing_policy=False):
        self.name, self.calls, self.kwargs, self.missing_policy = name, calls, kwargs, missing_policy
        self.exceptions = type("E", (), {"NoSuchEntityException": NoSuchEntity,
                                         "ResourceNotFoundException": NotFound})

    def __getattr__(self, op):
        def call(**kw):
            self.calls.append((self.name, op, kw))
            if op == "delete_role_policy" and self.missing_policy:
                raise NoSuchEntity("policy already gone")
            if op == "invoke":
                return {"Payload": io.BytesIO(b'{"ok": true}'), "LogResult": ""}
            return {}
        return call


class FakeSession:
    def __init__(self, missing_policy=False):
        self.calls, self.clients, self.missing_policy = [], [], missing_policy

    def client(self, name, **kwargs):
        self.clients.append((name, kwargs))
        return FakeClient(name, self.calls, kwargs, self.missing_policy)


class Deploy(unittest.TestCase):
    def setUp(self):
        self._real = dl.invoke_config
        dl.invoke_config = lambda: ("CONFIG", dict(dl.INVOKE_CONFIG))

    def tearDown(self):
        dl.invoke_config = self._real

    def test_invokes_are_never_retried_and_wait_for_the_whole_run(self):
        self.assertEqual(dl.INVOKE_CONFIG["retries"], {"total_max_attempts": 1})
        self.assertGreater(dl.INVOKE_CONFIG["read_timeout"], 900)   # Lambda's own limit
        s = FakeSession()
        dl.dry_run(s, "prices")
        (name, kw), = [c for c in s.clients if c[0] == "lambda"]
        self.assertEqual(kw["config"][0], "CONFIG")

    def test_dry_run_and_live_run_send_the_right_flag(self):
        s = FakeSession()
        dl.dry_run(s, "fx")
        dl.invoke(s, "prices", dry=False)
        payloads = [json.loads(kw["Payload"]) for _, op, kw in s.calls if op == "invoke"]
        self.assertEqual(payloads, [{"job": "fx", "dry_run": True}, {"job": "prices", "dry_run": False}])
        for _, op, kw in s.calls:
            if op == "invoke":
                self.assertEqual(kw["InvocationType"], "RequestResponse")

    def test_remove_deletes_a_role_whose_policy_is_already_gone(self):
        s = FakeSession(missing_policy=True)
        dl.remove(s)
        deleted = [kw["RoleName"] for _, op, kw in s.calls if op == "delete_role"]
        self.assertEqual(sorted(deleted), sorted([dl.ROLE, dl.SCHED_ROLE]))

    def test_remove_deletes_everything_it_creates(self):
        s = FakeSession()
        dl.remove(s)
        ops = {(n, op) for n, op, _ in s.calls}
        for want in [("scheduler", "delete_schedule"), ("lambda", "delete_function"),
                     ("iam", "delete_role_policy"), ("iam", "delete_role"), ("logs", "delete_log_group")]:
            self.assertIn(want, ops)
        scheds = [kw["Name"] for n, op, kw in s.calls if op == "delete_schedule"]
        self.assertEqual(sorted(scheds), sorted(dl.SCHEDULES))


if __name__ == "__main__":
    unittest.main()
