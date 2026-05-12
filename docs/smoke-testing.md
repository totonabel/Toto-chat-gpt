# Poker Wallet smoke testing checklist

Use this checklist before deploy with at least one leader device and 2-4 player devices/browsers. Enable the temporary debug panel with `?debug=1` on `/table/{tableId}/leader` or `/player` when validating state.

## Setup

- [ ] Configure `.env.local` with Firebase web app variables.
- [ ] Start locally with `npm run dev`.
- [ ] Open leader in one browser/device.
- [ ] Open players in separate browsers/devices/incognito windows.
- [ ] Keep DevTools console open on at least the leader browser.

## Table creation and join

- [ ] Create mesa from `/create`.
- [ ] Confirm generated code is visible and copyable/readable.
- [ ] Join player A by code.
- [ ] Join player B by code.
- [ ] Join players C/D by code for side-pot testing.
- [ ] Select available seats.
- [ ] Try double-clicking Join; confirm no duplicate player/seat.
- [ ] Try joining an occupied seat; confirm clear “Seat taken”/error.
- [ ] Refresh one joined player; confirm session restores to correct route and seat.

## Hand flow basics

- [ ] Start hand from leader.
- [ ] Confirm dealer rotates correctly between hands.
- [ ] Confirm small blind seat and posted amount.
- [ ] Confirm big blind seat and posted amount.
- [ ] Confirm currentTurnSeat/currentRound in debug panel.
- [ ] Confirm player whose turn it is sees highlight/toast/vibration.
- [ ] Confirm non-turn players have disabled actions.

## Player actions

- [ ] Check when no amount is owed.
- [ ] Confirm Check disabled when amountToCall > 0.
- [ ] Call exact amount.
- [ ] Raise with prepared chips.
- [ ] Double-click Call/Raise; confirm only one action lands.
- [ ] All-in; confirm status and disabled actions after all-in.
- [ ] Fold; confirm confirmation prompt and folded styling.
- [ ] Confirm action history logs each action.

## Pots and showdown

- [ ] Simple side pot: A all-in 100, B 300, C 300.
- [ ] Multiple side pot: A 50, B 150, C 300, D 300.
- [ ] Folded player does not receive pot.
- [ ] All-in player remains eligible only for correct pot(s).
- [ ] End hand and confirm pots appear in resolver.
- [ ] Select one winner for a pot and resolve.
- [ ] Select multiple winners for a tied pot and resolve.
- [ ] Try resolving the same pot twice; confirm it fails.
- [ ] Confirm empty pots cannot be distributed.

## Reloads and next hand

- [ ] Let a player reach broke.
- [ ] Leader reloads broke player.
- [ ] Confirm reloaded active-hand player is waitingNextHand.
- [ ] Start next hand.
- [ ] Confirm waitingNextHand players enter at next hand only.
- [ ] Confirm broke players do not count for dealer/blinds/turns.

## Connectivity and recovery

- [ ] Disconnect a player device/network.
- [ ] Confirm disconnected badge/banner appears.
- [ ] Reconnect player; confirm same uid/player doc recovers without duplicate.
- [ ] Disconnect leader during showdown.
- [ ] Reconnect leader; confirm dashboard recovers and can continue.
- [ ] Refresh browser on leader and player; confirm role route restores.
- [ ] Perform reconnect while an action is pending; confirm UI recovers gracefully.

## Finished/lobby states

- [ ] Confirm waiting/lobby state before first hand.
- [ ] Confirm playing state during hand.
- [ ] Confirm showdown state after End hand.
- [ ] Confirm finished table shows terminal state if status is set to finished.

## Mobile UX

- [ ] Verify vertical scroll works on small phones.
- [ ] Verify bottom action bar remains visible above safe area.
- [ ] Verify mobile keyboard does not break Create/Join layout.
- [ ] Verify tap targets are comfortable.
- [ ] Rotate to landscape and confirm no unusable overflow.
- [ ] Confirm debug panel does not block normal play when disabled.

## Debug tools

- [ ] Open `?debug=1` and confirm panel appears.
- [ ] Confirm panel shows currentTurnSeat.
- [ ] Confirm panel shows currentRound.
- [ ] Confirm panel shows eligible players by pot.
- [ ] Confirm Copy table state writes JSON to clipboard.
- [ ] Confirm action history has transaction logs.
