# Iteration 3: Attributes, skills, and opposed d10 pools

Status: approved by the owner; implemented on codex/iteration-3, pending owner acceptance and release.

## Intent and agreed scope

Establish the attribute/skill and dice foundation before implementing character progression. Use a fixed starter build for this iteration. Replace fixed attack damage with opposed d10 success pools in the existing three-slime game.

The owner explicitly keeps Prowess's present emphasis. Classes, attribute/skill specializations, and resource spending are outside scope. XP, leveling, advancement purchases, gear, character allocation screens, and new attack modes are deferred.

## Character rules

Attributes are Prowess, Cunning, and Resistance. Each starts at1; distribute the agreed2/2/1 spend in that order. Starter attributes are therefore Prowess3, Cunning3, Resistance2.

Skills are Combat, Subterfuge, and Lore. Each starts at0; the agreed2/2/1 spend yields Combat2, Subterfuge2, Lore1. No allocation UI or choice of starter builds is required.

Derived stats follow the supplied rules:

- Health maximum = Prowess + Resistance =5.
- Initiative = Prowess + Cunning =6.
- Resource capacity = Cunning + Resistance =5; no spending or recovery mechanics are implemented.

Only melee is playable in this iteration. Hero Attack uses Prowess + Combat =5d10. Hero Defense uses Resistance + Combat =4d10. Slimes have fixed3d10 Attack,3d10 Defense, and3 Health, without attribute allocation.

## Dice rules

Each original d10 showing8,9,or10 scores one success. An original10 keeps that success and grants one additional d10. The additional die also scores one success on8–10, but never grants another die, including on10. Ones and all other faces score nothing; they do not subtract successes or cause fumbles.

Record original faces separately from bonus faces and total successes. Example: original[10,8,3] plus bonus[10] totals three successes, with no further bonus roll. Every original10 grants its own single additional die.

Build the pool roller independently of the renderer, with an injectable random source for exact tests. Roll all original dice before their bonus dice. No extra luck, critical-hit multipliers, or exploding chains are introduced.

## Opposed combat and turn flow

Extend the existing hero-first attack/counterattack loop. A fuller initiative/round scheduler is deferred; derive Initiative but do not use it for turn ordering yet.

1. Attack rolls hero5d10 against slime3d10 Defense.
2. Ties favor the defender. Damage is max(0,attacker successes − defender successes). A winning defense prevents damage; it does not itself damage the attacker.
3. Reduce slime Health by that damage, clamped at zero. If defeated, award the existing victory immediately and do not roll a counterattack.
4. If the slime survives, roll its3d10 Attack against hero4d10 Defense and apply the same damage rule to the hero.
5. Preserve the existing command lock, terminal-state guards, Run, safe return position, independent slime completion, and defeat/Restart semantics.

Both sides may miss; a turn with no damage is valid. Battles no longer have a guaranteed two-attack victory. No automatic rerolls are made to force progress or rebalance the supplied rules.

## Feedback and persistence

Show the fixed attributes/skills and effective melee pools in a compact read-only summary. Battle feedback should identify original/bonus dice, each side's successes, and resulting damage, including ties/misses. Keep touch commands readable and accessible on the accepted phone sizes; implementation planning will choose the compact layout. No resource-use controls are shown.

New Game and Restart start the hero at5 Health; each slime encounter starts at3 Health. Continue persists the starter character data along with existing world/placements/progress. Individual slime HP remains battle-local, as it is today. Victory continues to heal the hero fully; Run preserves damage already taken. No other recovery changes are introduced.

Upgrade valid earlier saves without losing terrain, placements, or cleared encounters. Use the agreed starter character and clamp prior current HP to the new5 maximum, preserving positive values below5. Retain original recovery keys and newest-present-save precedence. Layer the accepted earlier migrations when needed, including the stable within-session migration behavior on blocked writes. Do not save transient dice rolls or active battles.

## Acceptance

1. Starter attributes/skills and derived stats match the agreed values; hero pools are5/4 and slime pools3/3 with3 Health.
2. Exact dice tests cover8/9/10 successes, multiple original10s, bonus10 not chaining, and1s never canceling successes.
3. Opposed ties/defender wins deal zero damage. Attacker margin deals damage; HP never becomes negative. A lethal hero attack skips every counterattack roll.
4. Slime counterattacks, Run, defeat/Restart, independent completion, and full healing on victory work with variable damage. Repeated/held input cannot resolve extra turns.
5. Save/Continue preserves character/world/progress; older valid saves upgrade once with capped Health and unchanged completion. Invalid saves and blocked storage remain safe.
6. Combat results are understandable on a phone, all accepted camera/input/layout/save scenarios remain covered, and deterministic test rolls replace assumptions about two-click wins.

The owner reviews this short design before implementation planning. Native execution remains selected; starting a new cloud chat requires an owner request.
