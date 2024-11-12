const Types = require("../../../../shared/js/gametypes");

const dialogue = {
  "npc": Types.Entities.BITNPC_BITCORN,
  "name": "bitcorn",
  "start": "introduction",
  "custom_css": {
    "avatar": "url(../img/3/BITNPC_BITCORN.png)",
    "background_position": "-18px -316px",
    "width": "60%",
    "left": "50%"
    // "height": 
    // "top":
  },
  /* update this to handle responses when quest is open and handle quest being completed.
  "resume_conditions": [
    // `quest_open`, `quest_closed`, `choice_made`, `has_item`, `killed_mob`, `is_level`
    {"conditions": [{ "if": "quest_open", "quest": "GOLDEN_KERNEL_QUEST" }], "goto": "introduction_more"},
    {"conditions": [{ "if": "quest_completed", "quest": "GOLDEN_KERNEL_QUEST" }], "goto": "quest_complete"}
  ],*/
  "nodes": {
    "introduction": {
      "text": "Well now, look who wandered in! Always happy to chat—what brings you my way, friend?",
      "options": [
        {
          "conditions": [{ "if": "quest_open", "quest": "GOLDEN_KERNEL_QUEST_TALKTOBIT" }],
          "text": "I heard something about a golden kernel...", "goto": "kernel_legend" 
        },
        { "text": "Tell me about this cornsino!", "goto": "ask_about_casino" },
        { "text": "I've heard you've got lots of stories. Care to share any?", "goto": "ask_about_bitcorn" },
        { "text": "Just passing through.", "goto": "farewell" },
      ]
    },
    "other_questions": {
      "text": "I'm all ears! What else would you like to chat about?",
      "options": [
        { 
          "conditions": [{ "if": "quest_open", "quest": "GOLDEN_KERNEL_QUEST_TALKTOBIT" }],
          "text": "What's this I hear about a golden kernel...", "goto": "kernel_legend"
        },
        { "text": "Tell me about this cornsino!", "goto": "ask_about_casino" },
        { "text": "I've heard you've got lots of stories. Care to share any?", "goto": "ask_about_bitcorn" },
        { "text": "Actually, I'll be on my way now.", "goto": "farewell" },
      ]
    },
    "farewell": {
      "text": "Alright, friend. If you want to talk, you know where to find me."
    },
    "ask_about_casino": {
      "text": "Ah, the ol' CORNhole—best entertainment this side of the sludge river! Don't mind that it's the only entertainment.<br><br>Whether you take LuckyFUNKZ for a spin or hit the tables for JackAce, this is the place where fortunes are made—or lost!",
      "options": [
        { "text": "LuckyFUNKZ? What's that about?", "goto": "casino_luckyfunkz" },
        { "text": "Tell me more about JackAce.", "goto": "casino_jackace" },
        { "text": "Oh! There's something else I wanted to ask you.", "goto": "other_questions" },
        { "text": "On second thought, I'll be on my way.", "goto": "farewell" }
      ]
    },
    "casino_luckyfunkz": {
      "text": "LuckyFUNKZ? Taco 'bout a fiesta! The reels are packed with FunkyTacos—each funkier than the last.<br><br>Get a few 'FEET' symbols—those are wild—and you might dance your way to a jackpot. Miss it, though, and all you've got left is deFEET... and tacos",
      "options": [
        { "text": "Tell me more about JackAce.", "goto": "casino_jackace" },
        { "text": "Oh! There's something else I wanted to ask you.", "goto": "other_questions" },
        { "text": "Thanks. I'll be on my way now.", "goto": "farewell" }
      ]
    },
    "casino_jackace": {
      "text": "JackAce is blackjack with some good ol' CORNhole pizzazz. The dealer? A robot with a perfect poker face. Don't let that metal grin fool ya—you gotta know when to hold 'em, know when to fold 'em, 'cause some hands are just... 2 legit 2 hit.",
      "options": [
        { "text": "LuckyFUNKZ? What's that about?", "goto": "casino_luckyfunkz" },
        { "text": "Oh! There's something else I wanted to ask you.", "goto": "other_questions" },
        { "text": "Thanks. I'll be on my way now.", "goto": "farewell" }
      ]
    },
    "ask_about_bitcorn": {
      "text": "Ohhh, a story you say? Now you're speaking my language—this is where things get... puzzling.<br><br>See, I spend most nights wanderin' and ponderin'—I call it my 'corntemplation' time... and during one of these sessions... enchworm crawled into my mind.",
      "options": [
        { "text": "Enchworm? Tell me more.", "goto": "enchworm_explanation" },
        { "text": "Oh! There's something else I wanted to ask you.", "goto": "other_questions" }
      ]
    },
    "enchworm_explanation": {
      "text": "I... I remember it came to me almost like a dream. Like... It slithered into my brain. And... Since then, parts of my brain just feel locked down. Inaccessible...<br><br>Seems like I was just the messenger and the real message is beyond me. Whenever I think about it, I feel I'm chasin' my own tail and get this strange sense I'm somehow droppin' hints while this thing keeps even me in the dark.",
      "options": [
        { "text": "So, what even is this Enchworm thing?", "goto": "enchworm_info" },
        { "text": "Oh! There's something else I wanted to ask you.", "goto": "other_questions" }
      ]
    },
    "enchworm_info": {
      "text": "It's just a little 2x9 set of animated pixels... Folks've been tryin' to crack it for years, and it just keeps spinnin' their minds like gears in a broken clock.",
      "options": [
        { "text": "What makes it so difficult?", "goto": "enchworm_difficulty" },
        { "text": "So, do you know the solution?", "goto": "enchworm_mystery_message" },
        { "text": "What's the strangest thing anyone's found?", "goto": "enchworm_strange_finds" },
        { "text": "Well, enough worm talk, let's talk about something else.", "goto": "other_questions" }
      ]
    },
    "enchworm_mystery_message": {
      "text": "I know that I know it, but I couldn't tell you. It's like this damn worm is playin' keep-away in my own brain. I swear the things not just a puzzle, it's gotta be alive.",
      "options": [
        { "text": "That's... unsettling.", "goto": "enchworm_mystery" },
        { "text": "Well, enough worm talk, let's talk about something else.", "goto": "other_questions" }
      ]
    },
    "enchworm_mystery": {
      "text": "It's all crazy. I can't even tell if enchworm is something I made... or if it found me. It's got a way of makin' me feel like I'm just a piece in its puzzle—like it's way bigger than me.<br><br>Some nights, I wonder if it's even meant to be solved. Or worse... what if solving it isn't the end, but just the beginning of something bigger?",
      "options": [
        { "text": "What makes it so difficult?", "goto": "enchworm_difficulty" },
        { "text": "So, who's working on this thing?", "goto": "enchworm_worminati" },
        { "text": "What's the strangest thing anyone's found?", "goto": "enchworm_strange_finds" },
        { "text": "Well, enough worm talk, let's talk about something else.", "goto": "other_questions" }
      ]
    },

    "enchworm_difficulty": {
      "text": "That's the thing—no one knows! Some think it's like a cosmic zip file, containin' everythin' that ever was and ever will be, neatly locked up inside that little 2x9 set of pixels.",
      "options": [
        { "text": "So, do you know the solution?", "goto": "enchworm_mystery_message" },
        { "text": "So, who's working on this thing?", "goto": "enchworm_worminati" },
        { "text": "Well, enough worm talk, let's talk about something else.", "goto": "other_questions" },
        { "text": "Well, I think I hit my worm talk quota for the day. I'll see you later!", "goto": "farewell" }
      ]
    },
    "enchworm_strange_finds": {
      "text": "Oh, the things people've found tryin' to crack it? They're somethin' else entirely. One guy went about it graphically, and I kid you not—he uncovered a tiny movie of a giraffe fallin' down an elevator shaft.<br><br>Mostly though, I see strange, partial messages. Some on the verge of making sense, some... not so much.",
      "options": [
        { "text": "Man, who finds this stuff?", "goto": "enchworm_worminati" },
        { "text": "My brain hurts. Let's talk about something else.", "goto": "other_questions" },
        { "text": "Well, I think I hit my worm talk quota for the day. I'll see you later!", "goto": "farewell" }
      ]
    },
    "enchworm_worminati": {
      "text": "Well, rumor has it that a secret society called the worminati has formed to crack the code and defeat the worm. They say it's made up of the best puzzle solvers across the universe, workin' in secret, night and day.<br><br>Some say the worminati is just a myth, nothin' more than a bedtime story made up by some cornspiracy nuts. But me? I feel they're out there... closer to the solution than even they know.",
      "options": [
        { "text": "Worminati, huh? Sounds a bit far-fetched.", "goto": "enchworm_mystery" },
        { "text": "My brain hurts. Let's talk about something else.", "goto": "other_questions" },
        { "text": "Well, I think I hit my worm talk quota for the day. I'll see you later!", "goto": "farewell" }
      ]
    },
    // GOLDEN_KERNEL_QUEST_TALKTOBIT
    "kernel_legend": {
      "text": "Ah, the golden kernel... It wasn't just a seed—it was our failsafe. I kept it hidden, figured it was safest that way—at least until we needed it.<br><br>See, that kernel's got more power than just growin' crops—it can magnify the luck of whoever holds it. If used with good intentions, it'll bring positive change. But if used for selfish reasons... bad things tend to happen, just like the night of the crash.",
      "options": [
        { "text": "What happened on the night of the crash?", "goto": "shadow_crash" },
        { "text": "Can it really grow anything?", "goto": "kernel_growth_power" }
      ]
    },
    "shadow_crash": {
      "text": "I saw someone... or something. A shadowy figure. They found where I'd hidden the kernel, and that's when things started to go wrong.<br><br>The ship's systems started failin'—lights flickerin', engines sputterin'. We lost control fast.<br><br>I saw the kernel get knocked loose and tumble into a ravine, and that shadowy figure slipped away into the dark.",
      "options": [
        { "text": "Do you know where the kernel is now?", "goto": "turdle_encounter" },
        { "text": "Any idea who the shadow was?", "goto": "shadow_identity" }
      ]
    },
    "shadow_identity": {
      "text": "I don't know who—or what—it was. I didn't get a good look, but somethin' about it didn't sit right with me.<br><br>Whoever it was, they wanted that kernel bad. It's been gnawin' at me ever since.",
      "options": [
        { "text": "Do you know where the kernel is now?", "goto": "turdle_encounter" },
        { "text": "The golden kernel, can it really grow anything?", "goto": "kernel_growth_power" }
      ]
    },
    "turdle_encounter": {
      "text": "I tried to recover the kernel after things settled, but that's when I saw it—a big ol' turtle, I gave it the nickname TURDle... for reasons.<br><br>Well, sittin' on its back was... the largest turd I've ever seen. And... right in the middle that big ol' plopper, glowin' through the muck, lay the golden kernel. I tried to wrestle it myself, but I was unarmed... I mean, I literally don't have arms",
      "options": [
        { "text": "So the kernel is on the TURDle's back?", "goto": "assign_quest" },
        { "text": "Can you tell me more about Thornbeard?", "goto": "thornbeard_hint" },
        { "text": "Can you tell me again about the golden kernel?", "goto": "kernel_legend" }
      ]
    },
    "kernel_growth_power": {
      "text": "Oh yeah. Drop that thing in dead dirt, and you'll have crops sproutin' by sunrise.<br><br>But it's more than just farming. It can restore life in ways you wouldn't believe... if, of course, the one holdin' it has their heart in the right place.",
      "options": [
        { "text": "Do you know where the kernel is now?", "goto": "turdle_encounter" },
        { "text": "What happened on the night of the crash?", "goto": "shadow_crash" }
      ]
    },
    "thornbeard_hint": {
      "text": "Look, I'm not one to air someone else's laundry—especially not Thornbeard's. Man's been through a lot, let's leave it at that. Dude has the biggest heart I've ever seen.<br><br>Just know, those plants in the greenhouse? They ain't just plants to him. They're... well, a way of holdin' onto somethin'. Maybe even someone.",
      "options": [
        { "text": "Someone? Who?", "goto": "bitcorn_privacy" },
        { "text": "So the kernel is on the TURDle's back?", "goto": "assign_quest" }
      ]
    },
    "bitcorn_privacy": {
      "text": "Look, if you really wanna know, best ask Thornbeard yourself. The man don't open up easy, but he's got his reasons.<br><br>Just... tread lightly, alright? That old beard's been through enough.",
      "options": [
        { "text": "You sure you can't tell me more about Thornbeard?", "goto": "thornbeard_nope" },
        { "text": "Alright, back to the kernel.", "goto": "assign_quest" }
      ]
    },
    "thornbeard_nope": {
      "text": "Look, I'm not one to air someone else's laundry—especially not Thornbeard's. Man's been through a lot, let's leave it at that. Dude has the biggest heart I've ever seen.",
      "options": [
        { "text": "I respect that, so this kernel... It's on the TURDle's back?", "goto": "assign_quest" }
      ]
    },
    "assign_quest": {
      "text": "If you're willin' to face that thing, bring back the kernel. Whether it's luck, magic, or just plain hope—we need it.<br><br>Now, it might sound strange, but this moon... it's alive in its own way. The CORNhole tapped into its 'internal plumbing' to handle waste—clever, huh?<br><br>Anyway, you'll wanna start at the toilet. It's not just porcelain—it's a one-way trip to places you wouldn't believe.",
      "actions": [
        { "type": "handout_quest", "quest": "GOLDEN_KERNEL_QUEST" }
      ],
      "options": [
        { "text": "Alright, I'm in.", "goto": "encouragement" },
        { "text": "No thanks. That's disgusting.", "goto": "farewell" }
      ]
    },
    "encouragement": {
      "text": "Good on ya, friend. And listen—keep an eye on Thornbeard. He's got a heart as tough as leather, but even leather cracks over time.",
      "record_choice": "accepted_kernel_quest"
    }
  }
};

exports.dialogue = dialogue;