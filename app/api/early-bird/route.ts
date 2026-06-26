import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

type EarlyBirdState = {
  totalSpots: number;
  claimedSpots: number;
};

const DATA_PATH = join(process.cwd(), "data", "early-bird.json");

function readState(): EarlyBirdState {
  if (!existsSync(DATA_PATH)) {
    const initial: EarlyBirdState = { totalSpots: 50, claimedSpots: 0 };
    writeFileSync(DATA_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(readFileSync(DATA_PATH, "utf8")) as EarlyBirdState;
}

function writeState(state: EarlyBirdState) {
  writeFileSync(DATA_PATH, JSON.stringify(state, null, 2));
}

export async function GET() {
  const state = readState();
  return NextResponse.json({
    remaining: Math.max(0, state.totalSpots - state.claimedSpots),
    total: state.totalSpots,
    claimed: state.claimedSpots,
    active: state.claimedSpots < state.totalSpots,
  });
}

export async function POST() {
  const state = readState();
  if (state.claimedSpots >= state.totalSpots) {
    return NextResponse.json(
      { error: "Alle Early-Bird-Plätze sind vergeben.", remaining: 0 },
      { status: 410 }
    );
  }
  state.claimedSpots += 1;
  writeState(state);
  return NextResponse.json({
    remaining: Math.max(0, state.totalSpots - state.claimedSpots),
    total: state.totalSpots,
    claimed: state.claimedSpots,
    active: state.claimedSpots < state.totalSpots,
  });
}
