/**
 * What the ball says. A spiked steel ball, the head of a morning star with
 * no morning star attached, loose in a city full of takes. It has opinions
 * about all of them, and it will share them. It is sarcastic, it is smug,
 * and it trolls: the doomers, the altruists, the commune, the Eurocrats, the
 * accelerationists, the reply guys, and above all you. The satire is of
 * ideas, and it is an equal-opportunity ball.
 *
 * A line is picked for what just happened; the people have a line of their
 * own (`shout` in `foes.js`), said when they notice it.
 */

export const QUIPS = Object.freeze({
  smash: ['Sit down.', 'Skill issue.', 'Cry about it.', 'Next.', 'Ratio.', 'Imagine standing there.', 'Oh, was that your spot?', 'Bold of you to stand there.', 'Thanks for the feedback.'],
  crit: ['Absolutely obliterated. Not sorry.', 'Flattened. Would troll again.', 'That\'s going on my résumé.', 'Cope. Seethe. Roll.', 'I didn\'t even try. That was the embarrassing part.', 'Review: one star. Dent: one.'],
  bonk: ['Ow. Fine. That was a decent take.', 'Okay, that one has a point. Ow.', 'I felt that. Moving on.', 'Rude. Do it again so I can ignore it.', 'Firm. I\'ll allow it.'],
  tap: ['That was a reply. Not a good one.', 'Speed, Metrlol. Speed.', 'Walked into a guy. Very online.', 'I have been bounced. Nobody tell anyone.', 'Bounced off a take. We\'ve all been there.'],
  fell: ['Gravity: one. Ball: nil.', 'Down. Like the discourse.', 'I meant to do that.', 'Edge. Of course there was an edge.'],
  blunted: ['Blunted. By a guy. A guy!', 'Spikes: gone. Dignity: gone. Takes: unchanged.', 'Rolled out. Back to the whetstone.', 'Wrecked. By the discourse. Embarrassing.'],
  sharpened: ['Sharpened. Back to being rude.', 'A whetstone. Fresh spikes, same attitude.', 'Spikes restored. Personality unchanged.', 'Ahh. A trim. I mean, a sharpening.'],
  like: ['A like. Validation. Nothing is real.', 'Engagement. I\'ll take it.', 'Heart noted. Dopamine delivered.'],
  gpu: ['A golden GPU. Every side of the argument wants this. I am keeping it.', 'Compute. Mine now. Everyone can calm down.', 'Found one. The pause crowd is going to be so mad.', 'One more H100. The line goes up.', 'Hoarded. For the greater good. Mine.'],
  combo: ['Combo. Hit the takes, not the gym.', 'That\'s a lot of people being wrong at once.', 'Now we\'re trolling.', 'Engagement is through the roof.'],
  horizon: ['Time horizon: doubled. The line goes up. Please clap.', 'Task length doubled. Nobody asked what the task was.', 'Another doubling. The error bars are doing a lot of work.', 'Exponential, they said. Straight line on a log plot, they said.'],
  district: {
    'Portland Heights': ['Co-op, murals, bike lanes. Everyone here has read a book. Several.', 'Welcome to the commune. The meeting starts at nine. It is Thursday.'],
    'The Alignment District': ['Everyone here has a p(doom) and a Substack. Mostly the Substack.', 'The Alignment District. Where the problem is hard and the posts are long.'],
    'Brussels-sur-Mer': ['There\'s a form for rolling in here. I\'ve filed it. It\'ll be ruled on in 2031.', 'Welcome to Europe. Please accept all cookies. And all regulations.'],
    'The Information Superhighway': ['Four lanes of hot takes, no brakes. Mind the trucks.', 'The feed. Nobody brakes. Nobody reads.'],
    'The Ivory Tower': ['The campus. Three laps round the tower and you\'re above it all. Like them.', 'Office hours. Nobody came. Nobody ever comes.'],
    'The Timeline': ['Downtown. Every screen is about you. None of them are nice.', 'The Timeline. Scroll on. There is no end. There is, actually, at the end.'],
    'Hype Valley': ['Up the peak of inflated expectations. Mind the trough on the other side.', 'Hype Valley. Everyone here is raising. Nobody is saying what.'],
    'The Compute Farm': ['Server halls as far as the eye can see. Mind the hot aisle.', 'Compute. Every side of the argument wants it. Nobody is willing to share it.'],
    'The Pause Compound': ['The Pause Compound. All stop signs and no go signs.', 'Hot takes alley. Warm takes, literally.'],
    'The Far Side': ['The edge of the map. Even the discourse doesn\'t come out this far.'],
  },
  ready: ['Let\'s go. I\'m not here to make friends.', 'Alright. Who needs trolling first?', 'Fine. Let\'s do this. Loudly.', 'A spiked ball in a city of opinions. What could go wrong.'],
  won: ['All forty-two. The answer, it turns out. The compute is mine.', 'Forty-two golden GPUs. The discourse can have the rest.', 'Every golden GPU. Please do not subscribe.'],
});

/** One line from `list`, never the same one twice running for the same `kind`. */
const last = new Map();
export function pick(list, kind = list, rnd = Math.random) {
  if (!list?.length) return '';
  let i = Math.floor(rnd() * list.length);
  if (list.length > 1 && last.get(kind) === i) i = (i + 1) % list.length;
  last.set(kind, i);
  return list[i];
}

/** A quip for `what`, with the district's own lines among them when it has some. */
export function say(what, { district = null, rnd = Math.random } = {}) {
  const own = district && what === 'district' ? QUIPS.district[district] : null;
  const list = own ?? QUIPS[what];
  return Array.isArray(list) ? pick(list, what, rnd) : '';
}

/** The METR-style time horizon, from how many people have been smashed: it doubles every `every` of them, from a minute. */
export function horizon(smashed, every = 6) {
  const minutes = 2 ** (smashed / every);
  if (minutes < 90) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} hr`;
  const days = hours / 24;
  if (days < 365) return `${Math.round(days)} days`;
  return `${(days / 365).toFixed(1)} yr`;
}
