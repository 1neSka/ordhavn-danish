import assert from "node:assert/strict";
import test from "node:test";

const economy = await import("../lib/gameEconomy.ts");

test("XP grants rank progress but cannot be passed to the spending API", () => {
  const start = { xp: 500, kroner: 100, rav: 3 };
  const reward = economy.grantActivityReward(start, "lesson-completed");
  assert.deepEqual(reward, { xp: 580, kroner: 132, rav: 3 });

  const purchase = economy.spend(reward, "kroner", 32);
  assert.equal(purchase.ok, true);
  assert.deepEqual(purchase.balance, { xp: 580, kroner: 100, rav: 3 });
});

test("maritime ranks require XP, retention and a meaningful sample", () => {
  const locked = economy.evaluateMaritimeRank({
    xp: 5_200,
    retention: { 7: { retention: 0.95, samples: 13 } },
  });
  assert.equal(locked.xpRank.id, "styrmand");
  assert.equal(locked.qualifiedRank.id, "baadsmand");
  assert.equal(locked.standing, "retention-locked");
  assert.equal(locked.gateReports[0].reason, "insufficient-samples");

  const qualified = economy.evaluateMaritimeRank({
    xp: 5_200,
    retention: { 7: { retention: 0.7, samples: 14 } },
  });
  assert.equal(qualified.rank.id, "styrmand");
  assert.equal(qualified.standing, "stable");
});

test("a previously earned rank can become threatened or be demoted", () => {
  const threatened = economy.evaluateMaritimeRank({
    xp: 12_000,
    previousRankId: "lods",
    retention: {
      7: { retention: 0.74, samples: 18 },
      14: { retention: 0.72, samples: 14 },
    },
  });
  assert.equal(threatened.rank.id, "lods");
  assert.equal(threatened.qualifiedRank.id, "skipper");
  assert.equal(threatened.standing, "threatened");
  assert.equal(threatened.gateReports.find((gate) => gate.day === 7)?.reason, "low-retention");

  const demoted = economy.evaluateMaritimeRank({
    xp: 12_000,
    previousRankId: "lods",
    retentionFailurePolicy: "demote",
    retention: {
      7: { retention: 0.74, samples: 18 },
      14: { retention: 0.72, samples: 14 },
    },
  });
  assert.equal(demoted.rank.id, "skipper");
  assert.equal(demoted.standing, "demoted");
});

test("rav is minted only by eligible measurement events and claim keys deduplicate it", () => {
  const daySeven = economy.evaluateRavMint({
    kind: "holdout",
    masteryKey: "hus::read",
    checkpointDay: 7,
    correct: true,
  });
  assert.deepEqual(daySeven, {
    claimKey: "rav:holdout:hus::read:7",
    reason: "holdout-day-7",
    amount: 1,
  });
  assert.equal(
    economy.evaluateRavMint(
      { kind: "holdout", masteryKey: "hus::read", checkpointDay: 7, correct: true },
      [daySeven.claimKey],
    ),
    null,
  );

  assert.equal(economy.evaluateRavMint({
    kind: "scenario",
    runId: "run-2",
    success: true,
    attemptNumber: 2,
    checksUsed: 1,
    hintsUsed: 0,
  }), null);
  assert.equal(economy.evaluateRavMint({
    kind: "scenario",
    runId: "run-hint",
    success: true,
    attemptNumber: 1,
    checksUsed: 1,
    hintsUsed: 1,
  }), null);

  const calibrated = economy.evaluateRavMint({
    kind: "brier",
    attemptId: "attempt-1",
    attemptNumber: 1,
    brierScore: 0.04,
  });
  assert.equal(calibrated?.amount, 2);
});

test("harbor purchases enforce rank, ownership and kroner without touching XP", () => {
  const balance = { xp: 3_000, kroner: 800, rav: 4 };
  const locked = economy.purchaseHarborBuilding(balance, "biblioteket", [], "letmatros");
  assert.equal(locked.ok, false);
  assert.equal(locked.reason, "rank-locked");

  const bought = economy.purchaseHarborBuilding(balance, "biblioteket", [], "matros");
  assert.equal(bought.ok, true);
  assert.deepEqual(bought.balance, { xp: 3_000, kroner: 150, rav: 4 });
  assert.deepEqual(bought.owned, ["biblioteket"]);
});

test("daily havneafgift catches up but never crosses its protected floor", () => {
  const statement = economy.applyDailyHarborFee({
    balance: { xp: 900, kroner: 62, rav: 1 },
    lastChargedOn: "2026-07-25",
    throughDate: "2026-07-28",
  });
  assert.equal(statement.chargedDays, 3);
  assert.equal(statement.nominalFee, 24);
  assert.equal(statement.chargedKroner, 12);
  assert.equal(statement.protectedByFloor, 12);
  assert.deepEqual(statement.balance, { xp: 900, kroner: 50, rav: 1 });
});

test("Kønsbanken turns confidence into risk and supports early cash-out", () => {
  assert.equal(economy.genderConfidenceMultiplier(50), 1.2);
  assert.equal(economy.genderConfidenceMultiplier(100), 3);
  assert.deepEqual(economy.settleGenderWager(100, 100, false), {
    stake: 100,
    confidencePercent: 100,
    multiplier: 3,
    correct: false,
    returnedKroner: 0,
    profitKroner: -100,
  });

  const started = economy.startKonsbankenRun({ xp: 10, kroner: 200, rav: 1 }, 100, "bank-1");
  assert.equal(started.ok, true);
  assert.equal(started.balance.kroner, 100);
  const afterRound = economy.playKonsbankenRound(started.run, 50, true);
  assert.equal(afterRound.bankKroner, 120);
  const cashed = economy.cashOutKonsbanken(started.balance, afterRound);
  assert.equal(cashed.balance.kroner, 220);
  assert.equal(cashed.run.status, "cashed-out");
});

test("weekly storm is deterministic per profile and Monday with one attempt", () => {
  const candidates = Array.from({ length: 12 }, (_, index) => ({
    itemId: `item-${index}`,
    weakness: 1 - index / 20,
  }));
  const monday = economy.createWeeklyStorm({ profileId: "local-user", date: "2026-07-27T20:00:00Z", candidates });
  const sunday = economy.createWeeklyStorm({ profileId: "local-user", date: "2026-08-02T20:00:00Z", candidates });
  assert.deepEqual(monday, sunday);
  assert.equal(monday.weekStartsOn, "2026-07-27");
  assert.equal(monday.itemIds.length, 7);
  assert.equal(new Set(monday.itemIds).size, 7);
  assert.equal(economy.canAttemptWeeklyStorm(monday, []), true);
  assert.equal(economy.canAttemptWeeklyStorm(monday, [{ stormId: monday.id, completedAt: "2026-07-28", score: 6 }]), false);

  const nextWeek = economy.createWeeklyStorm({ profileId: "local-user", date: "2026-08-03T12:00:00Z", candidates });
  assert.notEqual(nextWeek.id, monday.id);
});
