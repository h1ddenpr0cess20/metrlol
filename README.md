# Metrlol

A spiked steel ball, the head of a morning star with no morning star
attached, is loose in an open city of takes. There are no tracks and no
levels: Metrlol is one map, all of it there from the start, and the ball can
roll anywhere it can get to. In the way is the discourse: the Pause crowd and
the doomers, the effective altruists and the rationalists, the commune and
the theorists, the Eurocrats on strike, the accelerationists on a podcast,
and the reply guys, who are everywhere. Roll into them fast enough and they
are smashed; too slowly and they bounce off, and it costs you spikes. Each
time, the ball says something unkind about it.

Somewhere in all of it are **22 golden GPUs**. Every side of the argument
wants them. The ball is keeping them.

The sequel to [Metroll](https://github.com/h1ddenpr0cess20/metroll), and
made of the games before it:

- **the engine and the map** are [Petroll](https://github.com/h1ddenpr0cess20/petroll)'s: its renderer, ball physics, tiled map builder, traffic, hazards, minimap and HUD, and the layout of Petroleum Springs (which is tested to be rollable from end to end), re-dressed as a city of six districts;
- **the ball, the smash rules, the cast, the quips and the band** are Metroll's: the morning star's head, whose spikes snap off as it is knocked about; speed is everything (`smash.js`); the sculpted people (`src/cast/`, mostly in new clothes, plus a Pause protester and a Eurocrat); the sarcasm; and the music, played live in Web Audio;
- **the sculptor** is from the [Rock 'n' Roller](https://github.com/h1ddenpr0cess20/rocknroller-iii) games.

It is satire of ideas, not of anyone in particular, and it is an
equal-opportunity ball: the doomers get it, and so do the accelerationists,
the commune, the Eurocrats, and you.

![The title screen](docs/screenshots/title.jpg)

## Run

```sh
git clone https://github.com/h1ddenpr0cess20/metrlol
cd metrlol
npm install
npm run dev               # → http://localhost:5173
```

A static page: no server, no keys. `npm run build` puts it in `dist/`, which
runs from any folder. WebGPU where the browser has it, WebGL 2 where it
doesn't (`?renderer=webgl` pins it). Node 22.12 or later.

## Play

| | |
|---|---|
| <kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> or <kbd>WASD</kbd> | Roll. Up always rolls up the screen, however the view is turned. |
| Hold the mouse or a finger | Roll toward the pointer. The further it is from the ball, the harder the push. |
| <kbd>Space</kbd> or <kbd>Shift</kbd> | **Accelerate**: hold for a harder push and a higher top speed, until the meter runs dry (it refills when you let go). The ACCELERATE button on a touch screen. |
| <kbd>Q</kbd> <kbd>E</kbd>, or drag with the right mouse button | Turn the view. Dragging up and down tilts it. |
| Mouse wheel, or <kbd>+</kbd> <kbd>−</kbd> | Zoom. |
| Two fingers | Pinch to zoom, twist to turn, drag up or down to tilt. |
| <kbd>C</kbd> | Put the view back. |
| Gamepad | Left stick or d-pad rolls; right stick turns and tilts; shoulder buttons zoom; <kbd>A</kbd>, <kbd>X</kbd> or the right trigger accelerates; <kbd>Start</kbd> pauses. |
| <kbd>P</kbd> / <kbd>Esc</kbd> | An intermission (pause). |
| <kbd>M</kbd> | Sound on or off. |

### Speed is everything

How hard the ball hits someone is how fast the two were coming together, in
tiles a second, *their* walking included. Everybody has a **toughness**, the
speed it takes to smash them in one go, and a **power**, how much it hurts to
bounce off them.

| Speed | | What happens |
|---|---|---|
| 1.7 times what it takes (13 at the least) | **OBLITERATED!** | Gone, with double the cred. |
| At least their toughness | **SMASHED!** | Gone, thrown clear, and it costs the ball nothing. |
| Over half their toughness | **BONK** | You both bounce, and it costs some spikes, less the closer you were to a smash. |
| Under that | **WEAK** | It hurts, all of their power, and they don't move. |

Someone who isn't smashed is still worn down, so a doorman you can't hit hard
enough can be hit twice. The Prophet of Doom takes a good deal more.

- **Acceleration** is how you hit what you couldn't: hold it and the ball reaches speeds that smash anyone but the doorman and the Prophet. It runs dry in about three seconds, and refills in five.
- **Cred** is the score. Smashes build a **combo** (×5 at most) that multiplies each one.
- **Time horizon**, up in the corner, doubles every six smashes. The line goes up.
- **Props** go too: bins, benches, mailboxes, signs, hydrants, street lamps, trees, pumps, parked cars, and the bronze paperclip in the plaza. Each has a speed it takes (a cone 2.5, a bin 4, a lamp post 9, the paperclip 14), and is as solid as a wall below it. They are worth a little cred each, and come back with a new run.
- **Likes** are the little hearts lying about in lines. They are validation, and worth nothing.

### Staying in one piece

The ball starts with 100 **spikes**, and you can watch them snap off. It is a lump of forged steel and takes a beating: every knock costs half what it would. Hard
landings, cars, rolling drums, the steam in hot takes alley and the people it
fails to smash take them away. At nothing the ball is **blunted**, and it is
back at the last **whetstone** it rolled over, sharpened. A token pump's head
coming down on it blunts it outright. The bad takes tar pit swallows it, and
it's put back on the last firm ground.

What you've found, the last whetstone and the time so far are kept in the
browser (`metrlol.v1`), and the game plays the same with storage blocked.

## Metrlol

| | |
|---|---|
| ![Portland Heights](docs/screenshots/portland.jpg) | **Portland Heights**: the suburbs, and home. Co-op houses, a drained pool that is now the community garden, the consensus maze (still voting on the exit), a skate park with a quarter pipe you need a run-up for. The commune, the anarchists, the theorists, the doomscrollers. |
| ![The Alignment District](docs/screenshots/plaza.jpg) | **The Alignment District**: the Longterm Institute and the alley behind it, a group house with a car park up to the roof, the plaza where the Pause protest has been for a year (a bronze paperclip on a plinth in the middle of it), a building site whose crane has been paused since March. Doomers, effective altruists, rationalists, safety researchers, reply guys. |
| ![Brussels-sur-Mer](docs/screenshots/brussels.jpg) | **Brussels-sur-Mer**: a fuel-tax station (+21% VAT), a regulatory sandbox you have to roll through, the strike picket, the Euro shop (closed, lunch), a footbridge over the superhighway to the cookie banner on the hill, and behind it a club with a queue that has been there since Thursday. Eurocrats, strikers, scooter commuters, ravers, the doorman (the policy is no). |
| | **The Information Superhighway**: four lanes of trucks and tankers in both directions. Nobody brakes. Nobody reads. |
| ![The Compute Farm](docs/screenshots/compute-farm.jpg) | **The Compute Farm**: rolling dirt, token pumps nodding on their pads (do not stand under the head), a pipeline to roll along the top of to the end of the training run, the scaling-law derrick with a lift up to the platform, the bad takes tar pit with an island in it, the benchmark yard where the drums come after you. Accelerationists, VCs, podcasters. |
| ![The Pause Compound](docs/screenshots/pause-compound.jpg) | **The Pause Compound**: tanks (the tall one has a lift), a ramp up to a catwalk, pipe racks overhead, and hot takes alley, where the steam comes up out of the floor in a wave you have to ride the gap behind. And ![the Prophet of Doom](docs/screenshots/prophet.jpg) **the Prophet of Doom**, who has predicted the end of the world every year since 2003 and has been, technically, early. |

The music is Metroll's hardcore track (New York, 1989: a d-beat, no encores), start to finish.

## The cast

Twenty-eight kinds of people, sculpted in code (`src/cast/`) and baked in
background workers while the page loads; most are Metroll's, in new names
(the doomer is the mourner, the forecaster is the coroner, the longtermist is
the wizard, the effective altruist is the straight-edge kid: *donates ten
percent, does not shut up about the ten percent*). The Pause protester and
the Eurocrat are new. Who they are, and what they shout, is in `src/foes.js`.

## How it's made

| | |
|---|---|
| `src/vendor/gfx/` | Alan's renderer, as in Petroll, unchanged. |
| `src/mace.js`, `src/morningstar.js`, `src/ball.js` | The ball: Metroll's, untouched. |
| `src/cast/` | The people (`person.js`, `humanoid.js`, the rig and the skin), their library and bake worker. |
| `src/foes.js`, `src/crowd.js`, `src/smash.js` | Who is in the way, how they walk and come at the ball, and what a meeting costs. |
| `src/quips.js` | What the ball says, and the time horizon. |
| `src/map.js`, `src/town.js` | The map: a grid of tiles, with road paint, props, solids, traffic, hazards, pickups, signs and the crowd on top of them; and Metrlol, district by district. |
| `src/structures.js`, `src/models/` | What stands on the map: signs and billboards with words on them, tanks, pumps; sculpted street furniture, vehicles, whetstones, likes and GPUs. |
| `src/run.js` | The world as it runs, with nothing drawn: the rules for spikes, smashes, combos, pickups. The game draws it; the tests drive it. |
| `src/music.js`, `src/audio.js` | Metroll's band, and every sound effect, synthesised. |

| Script | |
|---|---|
| `npm run dev` | Vite dev server (and `/preview.html`: `?foes=pauser,eurocrat`, `?foes=all`, `?hurt=0.5`) |
| `npm run build` | Bundles to `dist/` |
| `npm test` | `node:test`: physics, the map builder, the city, the traffic, the hazards, the crowd and the smash rules, and an autopilot that has to find all 22 golden GPUs in one go without being blunted |
| `npm run lint` | ESLint |

In the browser console, `metrlol.debug.teleport(x, z)` puts the ball anywhere
on the map.
