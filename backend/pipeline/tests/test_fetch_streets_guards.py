"""fetch_streets: the run budget and the connection breaker.

The 2026-10-05 refresh lost to a 120-minute job limit because each district
after the first spent ~16 minutes timing out against an unreachable Overpass.
A cancelled job commits nothing and alerts nobody, so the script must stop
starting districts in time to end by itself. These tests pin that logic with
a fake clock; no network and no osmnx are needed.
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import fetch_streets as fs  # noqa: E402


class FakeClock:
    def __init__(self) -> None:
        self.t = 1000.0

    def __call__(self) -> float:
        return self.t

    def advance_min(self, m: float) -> None:
        self.t += m * 60


class Budget(unittest.TestCase):
    def test_spends_by_the_clock(self):
        clock = FakeClock()
        b = fs.RunBudget(80, clock=clock)
        self.assertFalse(b.exhausted())
        clock.advance_min(79.9)
        self.assertFalse(b.exhausted())
        clock.advance_min(0.2)
        self.assertTrue(b.exhausted())
        self.assertIn('80 min', fs.stop_reason(b, None))

    def test_the_workflow_stops_the_script_before_github_cancels_the_job(self):
        # 2026-11-11: one attempt ran 38 min past the budget (requests_timeout
        # bounds each read, not the download) and the job was CANCELLED at 120,
        # which skips the commit. The workflow's `timeout` must end the script,
        # with the kill grace and the commit step, inside timeout-minutes, and
        # must leave the script's own budget room to be the normal stop.
        import re
        yml = (Path(__file__).resolve().parents[3] / ".github" / "workflows"
               / "refresh-streets.yml").read_text(encoding="utf-8")
        job = int(re.search(r"timeout-minutes:\s*(\d+)", yml).group(1))
        limit = int(re.search(r"^\s*LIMIT=(\d+)m\s*$", yml, re.M).group(1))
        kill = int(re.search(r"--kill-after=(\d+)m", yml).group(1))
        self.assertIn('timeout --signal=TERM --kill-after=', yml)
        self.assertIn('"$LIMIT" python backend/pipeline/fetch_streets.py', yml)
        self.assertLess(fs.BUDGET_MIN + 15, limit)     # a normal slow district still fits
        self.assertLessEqual(limit + kill + 5, job)    # setup ~1 min + commit, with margin


class NoRetryAfterTheBudget(unittest.TestCase):
    """The second 2026-11-11 run: Nasr City's third walk-graph attempt started
    two minutes after the budget was spent and ran until the job was killed."""

    def test_first_try_is_never_refused_and_retries_ask_the_budget(self):
        clock = FakeClock()
        b = fs.RunBudget(80, clock=clock)
        from unittest import mock
        with mock.patch.object(fs, "log"):
            self.assertFalse(fs.no_more_retries(b, 1))
            clock.advance_min(81)
            self.assertFalse(fs.no_more_retries(b, 0))
            self.assertTrue(fs.no_more_retries(b, 1))
            self.assertTrue(fs.no_more_retries(b, 2))
            self.assertFalse(fs.no_more_retries(None, 2))

    def _fake_graph_that_spends(self, clock, minutes):
        def graph(poly, **kw):
            clock.advance_min(minutes)
            raise TimeoutError("ReadTimeout")
        return graph

    def test_report_card_does_not_retry_once_the_budget_is_spent(self):
        import tempfile
        from unittest import mock
        clock = FakeClock()
        budget = fs.RunBudget(80, clock=clock)
        clock.advance_min(70)
        ox = mock.Mock()
        ox.graph_from_polygon.side_effect = self._fake_graph_that_spends(clock, 15)
        gdf = mock.Mock()
        gdf.geometry.iloc = ["poly"]
        tmp = Path(tempfile.mkdtemp(prefix="streets-"))
        lines = []
        with mock.patch.object(fs, "OUT", tmp), \
             mock.patch.object(fs, "resolve_boundary", lambda ox, d: (gdf, d["name"], 10.0, "osm")), \
             mock.patch.object(fs.time, "sleep", lambda s: None), \
             mock.patch.object(fs, "log", lines.append):
            fs.build_report_card(ox, {}, [], budget=budget)
        self.assertEqual(ox.graph_from_polygon.call_count, 1)
        self.assertIn("    no retry: time budget of 80 min spent", lines)
        self.assertEqual(sum(ln.startswith("    not attempted") for ln in lines),
                         len(fs.DISTRICTS) - 1)

    def test_access_layer_does_not_retry_once_the_budget_is_spent(self):
        from unittest import mock
        clock = FakeClock()
        budget = fs.RunBudget(80, clock=clock)
        clock.advance_min(70)
        ox = mock.Mock()
        ox.graph_from_polygon.side_effect = self._fake_graph_that_spends(clock, 15)
        cached = mock.Mock()
        cached.geometry.iloc = ["poly"]
        resolved = {d["key"]: (cached,) for d in fs.DISTRICTS}
        with mock.patch.dict(sys.modules, {"networkx": mock.Mock()}), \
             mock.patch.object(fs.time, "sleep", lambda s: None), \
             mock.patch.object(fs, "log"):
            fs.build_access(ox, resolved, [], budget=budget)
        self.assertEqual(ox.graph_from_polygon.call_count, 1)


class AtomicWrite(unittest.TestCase):
    def test_a_failed_write_leaves_the_old_file_whole(self):
        import tempfile
        from unittest import mock
        p = Path(tempfile.mkdtemp(prefix="streets-")) / "streets-access.json"
        fs.write_atomic(p, '{"v": 1}')
        self.assertEqual(p.read_text(encoding="utf-8"), '{"v": 1}')
        with mock.patch.object(fs.os, "replace", side_effect=OSError("killed")):
            with self.assertRaises(OSError):
                fs.write_atomic(p, '{"v": 2, "half')
        self.assertEqual(p.read_text(encoding="utf-8"), '{"v": 1}')


class BreakerLogic(unittest.TestCase):
    def test_opens_after_two_connect_failures_in_a_row(self):
        br = fs.Breaker()
        br.record('ConnectTimeout')
        self.assertFalse(br.open)
        br.record('ConnectionError')
        self.assertTrue(br.open)
        self.assertIn('unreachable', fs.stop_reason(None, br))

    def test_a_success_resets_the_streak(self):
        br = fs.Breaker()
        br.record('ConnectTimeout')
        br.record(None)
        br.record('ConnectTimeout')
        self.assertFalse(br.open)

    def test_slow_is_not_down(self):
        # A read timeout means the endpoint answered slowly (the big districts
        # are slow); it must never trip the breaker.
        br = fs.Breaker()
        for _ in range(5):
            br.record('ReadTimeout')
        self.assertFalse(br.open)

    def test_nothing_to_stop_when_both_are_fine(self):
        self.assertIsNone(fs.stop_reason(fs.RunBudget(80, clock=FakeClock()), fs.Breaker()))
        self.assertIsNone(fs.stop_reason(None, None))


class Failover(unittest.TestCase):
    """2026-11-09 and 2026-11-11: the default Overpass server stopped
    accepting connections and the run gave up on every district after it.
    With mirrors the breaker must move on first, and open only at the end."""

    URLS = ["https://a.example/api", "https://b.example/api", "https://c.example/api"]

    def make(self):
        used = []
        ep = fs.Endpoints(self.URLS, used.append)
        return ep, fs.Breaker(endpoints=ep), used

    def test_starts_on_the_first_endpoint(self):
        ep, _, used = self.make()
        self.assertEqual((ep.current, used), (self.URLS[0], [self.URLS[0]]))

    def test_trips_move_to_the_next_endpoint_then_open(self):
        ep, br, used = self.make()
        for expected in self.URLS[1:]:
            br.record('ConnectTimeout')
            br.record('ConnectTimeout')
            self.assertFalse(br.open)
            self.assertEqual(ep.current, expected)
        self.assertEqual(used, self.URLS)
        br.record('ConnectTimeout')
        br.record('ConnectTimeout')
        self.assertTrue(br.open)
        self.assertIn('unreachable', fs.stop_reason(None, br))

    def test_a_working_mirror_carries_the_rest_of_the_run(self):
        ep, br, _ = self.make()
        br.record('ConnectTimeout')
        br.record('ConnectTimeout')
        for _ in range(8):
            br.record(None)
        self.assertFalse(br.open)
        self.assertEqual(ep.current, self.URLS[1])

    def test_slow_never_switches(self):
        ep, br, _ = self.make()
        for _ in range(5):
            br.record('ReadTimeout')
        self.assertEqual(ep.current, self.URLS[0])

    def test_no_endpoints_is_an_error(self):
        with self.assertRaises(ValueError):
            fs.Endpoints([], lambda u: None)

    def test_every_endpoint_down_still_ends_inside_the_job_limit(self):
        # The October replay with three dead endpoints: each district costs
        # ~16 min, so failover alone would run 6 districts (~96 min) past the
        # point the budget allows; the budget must still end the run in time.
        clock = FakeClock()
        budget = fs.RunBudget(fs.BUDGET_MIN, clock=clock)
        _, br, _ = self.make()
        clock.advance_min(5)
        for _ in range(10):
            if fs.stop_reason(budget, br):
                break
            clock.advance_min(16)
            br.record('ConnectTimeout')
        self.assertLess(budget.spent_min() + 5, 120)

    def test_default_list_starts_with_osmnx_default(self):
        self.assertEqual(fs.OVERPASS_URLS[0], "https://overpass-api.de/api")
        self.assertGreaterEqual(len(fs.OVERPASS_URLS), 2)


class Preflight(unittest.TestCase):
    """The first probe from a runner (2026-11-11): only the third endpoint
    answered. The run must try it first, not after ~an hour on the others."""

    URLS = ["https://a.example/api", "https://b.example/api", "https://c.example/api"]

    def test_the_11_november_probe_puts_the_working_mirror_first(self):
        order = fs.preflight_order(self.URLS, lambda u: u == self.URLS[2])
        self.assertEqual(order, [self.URLS[2], self.URLS[0], self.URLS[1]])

    def test_answering_endpoints_keep_their_listed_order(self):
        order = fs.preflight_order(self.URLS, lambda u: u != self.URLS[1])
        self.assertEqual(order, [self.URLS[0], self.URLS[2], self.URLS[1]])

    def test_none_answering_keeps_the_listed_order(self):
        self.assertEqual(fs.preflight_order(self.URLS, lambda u: False), self.URLS)

    def test_overpass_answers_parses_a_count_and_refuses_anything_else(self):
        from unittest import mock

        class Resp:
            def __init__(self, body): self.body = body
            def read(self): return self.body
            def __enter__(self): return self
            def __exit__(self, *a): return False

        cases = [
            (b'{"elements":[{"tags":{"nodes":"245"}}]}', True),
            (b'{"elements":[]}', False),
            (b'<html>502 Bad Gateway</html>', False),
        ]
        for body, want in cases:
            with mock.patch("urllib.request.urlopen", return_value=Resp(body)):
                self.assertIs(fs.overpass_answers("https://a.example/api"), want, body)
        with mock.patch("urllib.request.urlopen", side_effect=TimeoutError()):
            self.assertFalse(fs.overpass_answers("https://a.example/api"))

    def test_a_refusal_is_logged_with_its_reason(self):
        # Second 2026-11-11 run: "no answer" in 0.5 s from a server that then
        # served every drive network. The log has to say what it refused with.
        import urllib.error
        from unittest import mock
        err = urllib.error.HTTPError("https://a.example/api/interpreter", 429,
                                     "Too Many Requests", {}, None)
        self.addCleanup(err.close)
        lines = []
        with mock.patch("urllib.request.urlopen", side_effect=err), \
             mock.patch.object(fs, "log", lines.append):
            self.assertFalse(fs.overpass_answers("https://a.example/api"))
        with mock.patch("urllib.request.urlopen", side_effect=TimeoutError()), \
             mock.patch.object(fs, "log", lines.append):
            self.assertFalse(fs.overpass_answers("https://b.example/api"))
        self.assertIn("https://a.example/api: HTTP 429", lines[0])
        self.assertIn("https://b.example/api: TimeoutError", lines[1])


class TheOctoberRun(unittest.TestCase):
    """Replays 2026-10-05: 10 districts, every walk graph after the first
    failing with ConnectTimeout at ~16 minutes each. With the guards the
    access stage must stop after two failures, not run into the job limit."""

    def test_replay(self):
        clock = FakeClock()
        budget, breaker = fs.RunBudget(fs.BUDGET_MIN, clock=clock), fs.Breaker()
        clock.advance_min(25)                     # the report card stage, which succeeded
        attempted, skipped = 0, 0
        for i in range(10):
            if fs.stop_reason(budget, breaker):
                skipped += 1
                continue
            attempted += 1
            if i == 0:
                clock.advance_min(4)              # Downtown Cairo: fine
                breaker.record(None)
            else:
                clock.advance_min(16)             # 3 x 300 s ConnectTimeout + back-off
                breaker.record('ConnectTimeout')
        self.assertEqual(attempted, 3)
        self.assertEqual(skipped, 7)
        self.assertLess(budget.spent_min(), 120 - 5)


class CarryForward(unittest.TestCase):
    """A partial run must not delete districts it could not re-measure.

    The 2026-11-09 run measured 5 of 10 districts and published only those 5;
    the other 5 vanished from the live page.
    """

    KEYS = [d["key"] for d in fs.DISTRICTS]

    def row(self, key, pct):
        return {"key": key, "name": key.title(), "mean_within_15min_pct": pct}

    def test_failed_districts_keep_their_last_good_row(self):
        prev = {"as_of": "2026-08-07",
                "districts": [self.row(k, 50.0) for k in self.KEYS]}
        fresh = [self.row(k, 60.0) for k in self.KEYS[:5]]
        out = fs.carry_forward(fresh, prev, "2026-11-09")
        self.assertEqual([r["key"] for r in out], self.KEYS)
        for r in out[:5]:
            self.assertEqual((r["mean_within_15min_pct"], r["measured_on"]), (60.0, "2026-11-09"))
            self.assertNotIn("carried", r)
        for r in out[5:]:
            self.assertEqual((r["mean_within_15min_pct"], r["measured_on"], r["carried"]),
                             (50.0, "2026-08-07", True))

    def test_a_carried_row_keeps_its_original_date_when_carried_again(self):
        prev = {"as_of": "2026-11-09",
                "districts": [dict(self.row(self.KEYS[0], 50.0), measured_on="2026-08-07", carried=True)]}
        out = fs.carry_forward([], prev, "2026-12-01")
        self.assertEqual((out[0]["measured_on"], out[0]["carried"]), ("2026-08-07", True))

    def test_a_remeasured_district_drops_the_carried_flag(self):
        prev = {"as_of": "2026-11-09",
                "districts": [dict(self.row(self.KEYS[0], 50.0), measured_on="2026-08-07", carried=True)]}
        out = fs.carry_forward([dict(self.row(self.KEYS[0], 70.0), carried=True)], prev, "2026-12-01")
        self.assertEqual((out[0]["mean_within_15min_pct"], out[0]["measured_on"]), (70.0, "2026-12-01"))
        self.assertNotIn("carried", out[0])

    def test_no_previous_file_publishes_only_what_was_measured(self):
        out = fs.carry_forward([self.row(self.KEYS[2], 40.0)], None, "2026-11-09")
        self.assertEqual([r["key"] for r in out], [self.KEYS[2]])


class CarryForwardFeatures(unittest.TestCase):
    """The map outlines must survive a partial run too.

    The 2026-11-11 run measured 4 of 10 districts' drive networks and wrote
    a boundary file with only those 4, so the map lost six outlines.
    """

    KEYS = [d["key"] for d in fs.DISTRICTS]

    def feat(self, key, x):
        return {"type": "Feature", "geometry": {"type": "Point", "coordinates": [x, 0]},
                "properties": {"key": key, "name": key.title()}}

    def test_unmeasured_outlines_are_kept_and_dated(self):
        prev = {"type": "FeatureCollection", "as_of": "2026-11-09",
                "features": [self.feat(k, 1) for k in self.KEYS]}
        fresh = [self.feat(k, 2) for k in self.KEYS[:4]]
        out = fs.carry_forward_features(fresh, prev, "2026-11-11")
        self.assertEqual([f["properties"]["key"] for f in out], self.KEYS)
        for f in out[:4]:
            self.assertEqual((f["geometry"]["coordinates"][0], f["properties"]["measured_on"]),
                             (2, "2026-11-11"))
            self.assertNotIn("carried", f["properties"])
        for f in out[4:]:
            self.assertEqual((f["geometry"]["coordinates"][0], f["properties"]["measured_on"],
                              f["properties"]["carried"]), (1, "2026-11-09", True))
            self.assertEqual(f["type"], "Feature")
            self.assertNotIn("_feature", f["properties"])

    def test_previous_file_is_not_modified(self):
        prev = {"as_of": "2026-11-09", "features": [self.feat(self.KEYS[0], 1)]}
        fs.carry_forward_features([], prev, "2026-11-11")
        self.assertEqual(prev["features"][0]["properties"], {"key": self.KEYS[0], "name": self.KEYS[0].title()})

    def test_no_previous_file_keeps_only_fresh_outlines(self):
        out = fs.carry_forward_features([self.feat(self.KEYS[3], 2)], None, "2026-11-11")
        self.assertEqual([f["properties"]["key"] for f in out], [self.KEYS[3]])


class ReportCardCarriesForward(unittest.TestCase):
    """End to end through build_report_card with a fake osmnx: 4 districts
    measure, the rest time out, and the written files must still hold all 10."""

    def test_partial_run_writes_every_district(self):
        import json
        import tempfile
        from unittest import mock

        keys = [d["key"] for d in fs.DISTRICTS]
        good = set(keys[:4])
        tmp = Path(tempfile.mkdtemp(prefix="streets-"))
        prev_rows = [{"key": d["key"], "name": d["name"], "nodes": 1} for d in fs.DISTRICTS]
        (tmp / "streets-districts.json").write_text(json.dumps(
            {"as_of": "2026-11-09", "districts": prev_rows}), encoding="utf-8")
        (tmp / "streets-boundaries.json").write_text(json.dumps(
            {"type": "FeatureCollection", "as_of": "2026-11-09", "features": [
                {"type": "Feature", "geometry": None, "properties": {"key": k}} for k in keys]}),
            encoding="utf-8")

        class GDF:
            """Just enough of a GeoDataFrame: geometry.iloc[0] is the key,
            so the fake graph download knows which district it is."""
            def __init__(self, key):
                self.geometry = mock.Mock()
                self.geometry.iloc = [key]

            def to_json(self):
                return json.dumps({"features": [{"type": "Feature", "geometry": None,
                                                 "properties": {}}]})

        G = mock.MagicMock()
        G.number_of_nodes.return_value = 10_000
        G.number_of_edges.return_value = 20_000

        def graph(poly, **kw):
            if poly not in good:
                raise TimeoutError("ConnectTimeout")
            return G

        ox = mock.Mock()
        ox.graph_from_polygon.side_effect = graph
        ox.projection.project_graph.return_value = G
        ox.stats.basic_stats.return_value = {}
        ox.bearing.orientation_entropy.return_value = 1.0
        ox.convert.to_undirected.return_value.degree.return_value = [(1, 1), (2, 3)]

        with mock.patch.object(fs, "OUT", tmp), \
             mock.patch.object(fs, "resolve_boundary",
                               lambda ox, d: (GDF(d["key"]), d["name"], 10.0, "osm")), \
             mock.patch.object(fs, "bearing_graph", lambda ox, g: g), \
             mock.patch.object(fs, "orientation_histogram", lambda g: []), \
             mock.patch.object(fs.time, "sleep", lambda s: None), \
             mock.patch.object(fs, "date") as fake_date:
            fake_date.today.return_value.isoformat.return_value = "2026-11-11"
            skipped = []
            self.assertTrue(fs.build_report_card(ox, {}, skipped))

        card = json.loads((tmp / "streets-districts.json").read_text(encoding="utf-8"))
        bounds = json.loads((tmp / "streets-boundaries.json").read_text(encoding="utf-8"))
        self.assertEqual([r["key"] for r in card["districts"]], keys)
        self.assertEqual([f["properties"]["key"] for f in bounds["features"]], keys)
        self.assertEqual({r["key"] for r in card["districts"] if not r.get("carried")}, good)
        self.assertEqual({f["properties"]["key"] for f in bounds["features"]
                          if not f["properties"].get("carried")}, good)
        self.assertEqual(len(skipped), len(keys) - 4)


if __name__ == '__main__':
    unittest.main()
