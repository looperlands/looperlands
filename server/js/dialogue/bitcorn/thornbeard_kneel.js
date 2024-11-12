const Types = require("../../../../shared/js/gametypes");

const dialogue = {
  "npc": Types.Entities.BITNPC_THORNBEARD_KNEEL,
  "name": "Thornbeard",
  "start": "introduction",
  "custom_css": {
    "avatar": "url(../img/3/BITNPC_THORNBEARD_KNEEL.png)",
    "background_position": "-16px -20px",
    "width": "fit-content",
    "left": "50%"
  },
  "resume_conditions": [
    {"conditions": [{ "if": "quest_open", "quest": "GOLDEN_KERNEL_QUEST_TALKTOBIT"}], "goto": "quest_status_update"},
    {"conditions": [{ "if": "quest_completed", "quest": "KERNEL_OF_HOPE_QUEST" }],"goto": "quest_complete_response"}
  ],
  "nodes": {
    "introduction": {
      "text": "Howdy sapling, folks call me Thornbeard. Guess that's what happens when your beard's more weed than whisker.<br><br>Anyway, you here to gawk at a man tryin' to make dirt do tricks, or is there somethin' else on your mind?",
      "options": [
        { "text": "What are you working on?", "goto": "barren_greenhouse" },
        { "text": "I'll leave you be.", "goto": "farewell" }
      ]
    },
    "barren_greenhouse": {
      "text": "This masterpiece, of course! I call it 'The Frustration of Adam'. Real complicated stuff. I plant, they ignore me. Except for one... *He gestures to a the tiny sprout* That's Bud. Been stickin' it out with me, poor fella. Ain't much to look at, but he's tryin. *Leans closer to the plant and mutters*: 'I know... I'm tryin', Bud. I'll get you a family, one way or another.'",
      "options": [
	      { "text": "Why does it matter so much to you?", "goto": "deeper_motivation" },
        { "text": "Why keep trying if nothing grows?", "goto": "mysterious_reason" },
        { "text": "Maybe it's time to move on?", "goto": "gruff_response" }
      ]
    },
	"deeper_motivation": {
	  "text": "This ain't just about plants, sapling. It's about seein' somethin' grow. It's about not lettin' things wither away... not again.<br><br>When you spend your days chasin' life, you learn somethin': everything worth havin' takes time.",
	  "goto": "mysterious_reason"
	},
    "mysterious_reason": {
      "text": "Let's just say... I made a promise and I keep my promises.<br>Besides, some things are worth fightin' for... even if they feel impossible.",
      "options": [
        { "text": "A promise to who?", "goto": "hint_at_eve" },
        { "text": "I get it. Anything I can do to help?", "goto": "nudge_to_bitcorn" }
      ]
    },
    "hint_at_eve": {
      "text": "To someone... important. She was much better with plants than I'll ever be.<br>Used to say if you put your heart into somethin' for long enough, it'll grow....<br>Maybe my old heart hasn't got enough, but I ain't givin' up.",
      "goto": "nudge_to_bitcorn"
    },
    "nudge_to_bitcorn": {
      "text": "Y'know, bitcorn's always spinnin yarns—I've heard that ol yap talk of a golden kernel that can breathe life into the deadest dirt.<br><br>Now, I ain't sayin I believe him... but if there's even a sliver of truth to it, it might be our only shot at growin somethin worth lookin at.<br><br>Course, as with life, no good thing comes easy. bitcorn says some mutated beast—a turtle, if you believe it—swallowed the thing. Now, it's just... marinatin' in some muck on the back of its shell.",
      "actions": [
        { "type": "handout_quest", "quest": "GOLDEN_KERNEL_QUEST_TALKTOBIT" }
      ],
      "options": [
        { "text": "I'll find it for you.", "goto": "grateful_response" },
        { "text": "That sounds disgusting. No thanks.", "goto": "gruff_response" }
      ]
    },
	
    "grateful_response": {
      "text": "Heh. Didn't think you'd have the guts. Glad I was wrong. Good luck, sapling, and try not to step in anything you can't scrape off.",
      "record_choice": "accepted_kernel_quest"
    },
    "gruff_response": { "text": "Fair enough. Ain't everyone cut out for wadin' through muck. Just... don't let that life in you wither away, sapling."
    },
    "farewell": { "text": "Alright then, sapling. I'll be here... just me and my dirt."
	},
    "quest_status_update": {
      "text": "Back already? Any luck with the kernel, or are ya just stoppin' by cause ya missed me?",
      "options": [
        { "text": "I'm still working on it.", "goto": "farewell" },
        { "text": "Can you remind me why this kernel is so important?", "goto": "hint_about_quest" }
      ]
    },
	// Branch for when the player completes the quest
    "quest_complete_response": {
      "text": "Well, I'll be... you actually did it. Maybe there's hope for this place after all.<br>Thank you, sapling. You don't know what this means to me.",
      "options": [
        { "text": "Happy to help, Thornbeard.", "goto": "second_farewell" }
      ]
    },
    "second_farewell": {
      "text": "Alright, get on outta here before I get all misty-eyed. Ya done good, sapling... real good."
    }
  }
};

exports.dialogue = dialogue;