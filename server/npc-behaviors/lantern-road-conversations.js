// Friendship campaign dialogue. Quest IDs stay stable for existing saves.
const conversations = {
    "WRECK_LETTERS": {
        "topic": "Adam saved Rowan a place. Have you seen him?",
        "offer": "Not since the storm. Rowan used to bring our invitations ashore. I found his torn pouch, but the letters washed farther up the beach. Will you look for them?",
        "question": "Could the neighbours have decided not to come?",
        "answer": "Perhaps. But I would rather read the letters before deciding what people meant. A storm can look a lot like a broken promise.",
        "accept": "I will look for Rowan's letters.",
        "waiting": "Did you find the pouch? I would like to know who those invitations were for.",
        "ready": "You found the pouch and cleared the crabs? Let me see those letters.",
        "report": "The letters never reached their neighbours.",
        "reply": "They never reached their friends. Rowan must have thought nobody wanted his company. Take this news to Mara; she used to walk the Forest trail with him.",
        "where": {
            "letters": "On the western part of Beach, among the storm debris northwest of my landing."
        }
    },
    "MILL_LIGHT": {
        "topic": "Jimi’s visitors could use some bread. Can you help?",
        "offer": "Gladly. The storm soaked our deliveries, but I tucked one sack of grain inside. Would you check that it stayed dry? I can grind it and pack bread for the shore.",
        "question": "Why send bread before more invitations?",
        "answer": "It is hard to feel welcome when you are hungry. Let us make sure the visitors have something to eat before asking them to travel again.",
        "accept": "I will check the grain inside the windmill.",
        "waiting": "Did the stored grain stay dry?",
        "ready": "You checked the sack? Is the grain still good?",
        "report": "The sack inside stayed dry. There is good grain for the bread.",
        "reply": "Excellent. Here is a basket of fresh bread for your satchel. Take it to the visitors on Beach; save the crumbs for the gulls.",
        "where": {
            "receiver": "Inside the old windmill, just south of me. Use the passage beside Town’s southern windmill."
        }
    },
    "COAST_SIGNAL": {
        "topic": "The windmill packed bread for your visitors.",
        "offer": "That smells wonderful. Clear two crabs from the Beach approach, then leave the basket where the travellers are waiting. If you promised to check on them, stop by their place too.",
        "question": "Will they still want to visit after the storm?",
        "answer": "Ask them. Some want a rest; some are already asking about the forest. A warm meal gives everyone a chance to choose.",
        "accept": "I will make the landing safe.",
        "waiting": "Have the travellers got their bread and a clear approach?",
        "ready": "They sent their thanks. Did you keep the promise we made?",
        "report": "The bread is there, the approach is clear, and I kept our promise.",
        "reply": "Then they can rest without feeling forgotten. Take the invitation pouch’s news to Mara in the forest; she has been waiting for an answer too.",
        "where": {
            "travellers": "At the waiting place on the northern Beach shore, east of the bread basket’s resting spot.",
            "relay": "At the waiting place on the northern Beach shore, northwest along the coast from my landing."
        }
    },
    "FOREST_MARKERS": {
        "topic": "Adam is still saving places for the forest neighbours.",
        "offer": "We used to walk this trail together. Would you visit the southern arrow and the northern knot? I would like to know whether Rowan still leaves his marks there.",
        "question": "Why did you stop writing to Town?",
        "answer": "After so many unanswered invitations, I thought they wanted to be left alone. But I never asked. That is what bothers me now.",
        "accept": "I will walk past both markers. Let us find out what happened.",
        "waiting": "Have you visited both arrows yet? I need both before I can tell you where the old route went.",
        "ready": "You saw both marks? Did you recognise his knot?",
        "report": "The arrow points to Town, and his knot is still on the northern branch.",
        "reply": "Then he has not forgotten the paths we shared. Vince kept a letter for him in the old archive. Perhaps it will help him remember that his friends have not forgotten him either.",
        "where": {
            "south": "West along this trail, at the marker pointing south toward Town.",
            "north": "Northwest of that marker, farther up the old forest trail."
        }
    },
    "KEEPER_KNOTS": {
        "topic": "You recognised Rowan's knot. What should we check?",
        "offer": "The note tied beside the eastern trail, beyond the northern marker. I will keep guiding walkers here. Could you look for Rowan’s knot there?",
        "question": "Do you think Rowan meant to hurt the neighbours?",
        "answer": "I do not know. He was careful with his knots, and careful with people. If he warned everyone away, I want to know what frightened him.",
        "accept": "I will read the trail warning and look for his explanation.",
        "waiting": "Was there a note beside that knot?",
        "ready": "You found his warning? What did it say?",
        "report": "His note says, \"Keep them away until the north is safe.\"",
        "reply": "Then he was afraid for us. That does not explain his silence, but it changes how I read it. I put a fresh lantern in your satchel. I kept the last courier's ledger; it may tell us what happened in the north.",
        "where": {
            "relay": "Beside the eastern Forest trail, east of the northern marker."
        }
    },
    "STILL_WAITING": {
        "topic": "May I see the courier's ledger you kept?",
        "offer": "It is in the sheltered cache by the western trail. Bring it out, and leave a fresh lantern at the southern marker. I still have living neighbours to guide.",
        "question": "Why did you keep the satchel all this time?",
        "answer": "I thought the courier might come back for it. Keeping the path ready felt easier than asking why nobody returned. I would like an answer now.",
        "accept": "I will recover the ledger and light your trail.",
        "waiting": "Have you found the ledger and set the lantern? We need the record, but the walkers need a light too.",
        "ready": "The trail is lit again. What did the courier write?",
        "report": "The ledger records a failed rescue near the graveyard, then a desert delivery.",
        "reply": "Take that record to Vince, with Jimi's coastal report. He keeps the memorial names. I will keep this path open, and bring berries when we can gather again.",
        "where": {
            "ledger": "In the sheltered cache on the western trail, south of the northern marker.",
            "lantern": "At the southern trail marker west of me, where you read the arrow toward Town."
        }
    },
    "STONE_NAMES": {
        "topic": "Jimi's letters and Mara's ledger describe the same rescue.",
        "offer": "Yes. There are three names on the graveyard memorial that I need you to read. Then we can speak about Rowan with the facts in front of us.",
        "question": "Why do you need both reports?",
        "answer": "The letters tell us who was expected. The ledger tells us what happened on the route. Either one alone could make us blame the wrong person.",
        "accept": "I will read the memorial names.",
        "waiting": "Have you read all three names on the stone?",
        "ready": "You have been to the memorial. Whose names did you find?",
        "report": "Elian, Sera and Tomas. Elian was Rowan's friend.",
        "reply": "Sera and Tomas were couriers. Elian went with them to reopen the road. Rowan could not bring them home. His silence began with that loss.",
        "where": {
            "names": "At the memorial in the central graveyard, north of Town."
        }
    },
    "UNDELIVERED_LETTER": {
        "topic": "Mara says you kept a letter for Rowan.",
        "offer": "From Elian, an old walking companion. It was left in the crypt archive before the storm, and never reached Rowan. Would you bring it out? He deserves to hear it.",
        "question": "What did Elian want to tell him?",
        "answer": "That the best part of their walks was the company. I will let the letter say the rest; friendship sounds different in someone’s own words.",
        "accept": "I will find the letter and keep it safe for Rowan.",
        "waiting": "Have you found Elian’s letter in the archive?",
        "ready": "You have the letter? What did his friend write?",
        "report": "“A shorter walk with a friend beats a long road alone. There is always a place for you.”",
        "reply": "Keep it in your satchel for Rowan. Nessa in the Desert knew him too. She could use a hand with the caravan before we visit him.",
        "where": {
            "letter": "In the crypt archive north of its return passage. Use the archive entrance on the eastern side of Graveyard."
        }
    },
    "MISSING_LIGHT": {
        "topic": "Let us light a lantern for Elian and the couriers.",
        "offer": "Yes. I packed a memorial lantern in your satchel. Clear two skeletons from the Graveyard paths first, then place it at their stone. Their neighbours should be able to reach it safely.",
        "question": "What should I say when I light it?",
        "answer": "Their names are enough. You do not have to turn another person's grief into a speech.",
        "accept": "I will light their memorial lantern.",
        "waiting": "Is the lantern lit at the three names?",
        "ready": "You lit it? Thank you. Was the stone left in peace?",
        "report": "The lantern is steady. I left the names in peace.",
        "reply": "That is enough. I found Nessa's caravan address in the ledger. She is still waiting in the southern desert with the last delivery. Ask her what stopped it.",
        "where": {
            "memorial": "At the same three-name memorial in central Graveyard."
        }
    },
    "EMPTY_LANTERNS": {
        "topic": "Vince sent me. What stranded your caravan?",
        "offer": "Wind has covered parts of the trail. I will not leave tired companions behind to find out whether it is still passable. Would you walk past the two markers north of camp?",
        "question": "Could you just travel during the day?",
        "answer": "Some of us are exhausted, and the heavy supplies cannot move quickly. I need a route everyone can use, including anyone who falls behind.",
        "accept": "I will check both caravan markers.",
        "waiting": "Have you found both caravan markers?",
        "ready": "You have walked the trail. What did the markers show?",
        "report": "The first arrow is half buried. The second has Rowan’s knot and a warning.",
        "reply": "So he asked us to turn back; we did not simply lose the trail. I kept his last parcel. Will you help me understand what he wanted?",
        "where": {
            "south": "At the caravan marker just north of our southern Desert camp.",
            "north": "Farther north on the central Desert trail, at the second marker."
        }
    },
    "LAST_DELIVERY": {
        "topic": "What was in your last delivery?",
        "offer": "His travelling cloak, with a note I never knew how to answer. The parcel is east of camp. Please bring it out before we decide how to follow him.",
        "question": "Who are you trying to protect by staying here?",
        "answer": "Everyone in this caravan. Some need a sheltered rest; some are carrying heavy packs. I would like a route we can manage together.",
        "accept": "I will check the dispatch box.",
        "waiting": "Have you found Rowan’s note in the parcel?",
        "ready": "You have his note. Shall we take the sheltered eastern detour, or the direct road with our loaded packs?",
        "report": "He asked everyone to stay back. He left his satchel with the northern miners.",
        "reply": "He was worried for us. That does not mean he should be alone. I will gather the caravan for whichever route we choose.",
        "where": {
            "dispatch": "At the dispatch cache east of our camp, beside the caravan's supplies."
        }
    },
    "ROAD_WE_TAKE": {
        "topic": "Vince sent me. Could I help your caravan?",
        "offer": "Yes, please. Some of us need a sheltered rest, and our packs are heavy. We can use the eastern detour or the direct central road. Which route would you check for us?",
        "question": "Will everyone be able to come to the picnic?",
        "answer": "If we find a route we can manage together. I will bring fruit and spare cloth; there should be enough to share.",
        "accept": "I will check our route.",
        "waiting": "Have you walked the route we chose?",
        "ready": "You checked the footing? Can we bring everyone along?",
        "report": "Our chosen route is ready. Nobody needs to be left behind.",
        "reply": "Thank you for thinking of the whole caravan. Orin on the southern Lavaland path still has Rowan’s travelling satchel. Ask him about our old friend.",
        "where": {
            "detour": "On the sheltered eastern Desert path, northeast of camp.",
            "direct": "On the central Desert road north of camp, west of the caravan markers."
        }
    },
    "HEAT_WITHOUT_LIGHT": {
        "topic": "Nessa remembers Rowan coming this way. Did you know him?",
        "offer": "Very well. He knew the northern paths better than anyone. Orin walked with him often; ask him what happened after the rescue, then bring me his answer.",
        "question": "Why did nobody go after him?",
        "answer": "We thought he wanted to be left alone. There is a difference between giving a friend space and forgetting to ask how he is.",
        "accept": "I will ask Orin about his friend.",
        "waiting": "Did Orin tell you what became of Rowan?",
        "ready": "You spoke to Orin? What does he remember?",
        "report": "Rowan left his travelling satchel behind and stopped visiting.",
        "reply": "That old satchel went everywhere with him. Orin kept it safe. Perhaps something familiar will help Rowan remember he still has friends.",
        "where": {
            "vent": "Speak to Orin on the southern Lavaland path, down from the northern miner."
        }
    },
    "MISSING_REGULATOR": {
        "topic": "Nessa remembers Rowan’s travelling satchel. Did you keep it?",
        "offer": "I did. Rowan left it in the northern store after the storm. Bring it back and hand it to me; I would like to have it ready if he feels like walking with us again.",
        "question": "Why did he stop joining your walks?",
        "answer": "He thought nobody wanted him there. We thought he wanted some space. I wish we had talked instead of guessing.",
        "accept": "I will find his satchel and bring it back to you.",
        "waiting": "Have you found the satchel? Hand it to me when you are ready.",
        "ready": "The stitching is his. Was his cup still inside?",
        "report": "His cup and old map are still there. I handed the satchel back to you.",
        "reply": "I will keep it ready for him. Take Elian’s letter through the keeper’s passage in northern Town. Rowan is staying in the Gauntlet. Tell him we miss his company.",
        "where": {
            "regulator": "Inside the northern store beyond the existing northern Lavaland door. Look for the wrapped satchel past the entrance.",
            "fit": "Hand the satchel to Orin on the southern Lavaland path."
        }
    },
    "ROWAN_PROTECTED": {
        "topic": "What did Rowan leave on the northern trail?",
        "offer": "A note about the rescue. Look north of me, along the path toward the miner. Read it before asking him to leave the place where he feels safe.",
        "question": "Why not tell him that he was wrong?",
        "answer": "He already blames himself. He needs to hear that we remember his care as well as what went wrong, and that he can decide how to come back.",
        "accept": "I will read his record before I speak to him.",
        "waiting": "Have you read Rowan's watch record?",
        "ready": "You have seen the record. Where did he go after the rescue?",
        "report": "He could not bear to lead another friend into danger. He is staying in the Gauntlet.",
        "reply": "Take Elian’s letter to him. Use the keeper’s passage beside Adam’s northern Town rounds. Listen first; he has had plenty of time to hear his own fears.",
        "where": {
            "record": "On the northern Lavaland trail, between Orin and the miner."
        }
    },
    "OLD_DEFENCES": {
        "topic": "Rowan? I brought news from the people along your road.",
        "offer": "You came all that way? Please be careful. Two death knights haunt the approach. Clear them, find my old staff and read the carving by my resting place. Then we can talk without watching the path.",
        "question": "Why stay here if the approach is dangerous?",
        "answer": "I know every corner of these ruins. Leaving would mean choosing a new road, and I have been afraid of that. Clear the two death knights before looking for the staff and carving.",
        "accept": "I will clear the approach and find your staff.",
        "waiting": "Is the approach clear? Have you found the staff and read the carving?",
        "ready": "That is my old staff. What did the carving say?",
        "report": "“Wait here for the others.” You have been waiting alone since the rescue.",
        "reply": "Every night. I thought if I stayed, nobody else would have to take the risk. Tell me what you brought. I am listening now.",
        "where": {
            "switch": "Just north of Rowan’s resting place in the Gauntlet.",
            "log": "Northeast of Rowan, beside the old stonework. Use the keeper’s passage in northern Town."
        }
    },
    "KEEPER_CHOICE": {
        "topic": "Rowan? Your friends asked me to bring you this letter.",
        "offer": "My friends? I thought the invitations had been left unanswered on purpose. Please hand me Elian’s letter and stay while I read it.",
        "question": "Why did you stop visiting?",
        "answer": "After the storm I felt awkward asking again. The longer I waited, the harder the first visit seemed. I have missed them all this time.",
        "accept": "I will hand you the letter. There is no hurry.",
        "waiting": "Could you hand me the letter? I would like to hear what Elian wrote.",
        "ready": "A shorter walk with a friend... I have missed that. Should I start walking the old rounds with them again, or take things slowly and share the paths I know?",
        "report": "Your friends still want your company. You can choose how to return.",
        "reply": "Thank you for letting me choose. Tell Bstrat I would like to come to the picnic. One story at the table feels like a good place to begin.",
        "where": {
            "letter": "Hand the letter to Rowan at his resting place in the Gauntlet."
        }
    },
    "LIGHT_SHARED": {
        "topic": "Adam kept your place at the table. Would you like to come?",
        "offer": "I think I would. Ask me again when you are ready to carry my answer. I have spent so long assuming nobody expected me.",
        "question": "What if you want to leave early?",
        "answer": "Then I will. A place at the table is an invitation, not another duty. I can stay for one story and decide about the next.",
        "accept": "I will carry your answer to the neighbours.",
        "waiting": "Come and ask me about the table. I would like to answer in person.",
        "ready": "You have my answer. Will you tell Bstrat?",
        "report": "You would like to come. Adam has kept your place.",
        "reply": "Tell her yes. And ask her to invite the others personally this time. Nobody should have to guess whether they were remembered.",
        "where": {
            "controls": "Speak to Rowan beside his resting place in the Gauntlet."
        }
    },
    "RETURNED_INVITATIONS": {
        "topic": "Rowan would like to come. Shall we ask the others?",
        "offer": "That makes me happy. Would you invite Jimi, Mara, Nessa and Orin in person? We will gather at Party Beach. Please ask what they would like to bring too.",
        "question": "Why deliver them in person this time?",
        "answer": "Because this time we can hear each other’s answers. A friend should not have to guess whether there is a place for them.",
        "accept": "I will ask all four neighbours in person.",
        "waiting": "Have you heard back from Jimi, Mara, Nessa and Orin?",
        "ready": "You have all four replies? Who can come?",
        "report": "All four accepted. Bread, berries, caravan supplies and blankets for the table.",
        "reply": "They all said yes! Tell Adam; he is arranging the contributions for the long table at Party Beach.",
        "where": {
            "coast": "Give Jimi his invitation at his Beach landing.",
            "forest": "Give Mara hers on the southern Forest trail.",
            "desert": "Ask Nessa at the caravan camp in southern Desert.",
            "north": "Ask Orin on the southern Lavaland path."
        }
    },
    "BRING_WITH_US": {
        "topic": "Bstrat has replies from every region. What can I bring?",
        "offer": "A pair of hands would help most. Take the contributions to the long table at Party Beach and make room for every basket. We started with one borrowed basket; look how far it has travelled.",
        "question": "What about Rowan's empty place?",
        "answer": "It is his place, whether he keeps the watch or rests. I will set it where he can hear the neighbours without having to explain himself all evening.",
        "accept": "I will arrange the contributions at the table.",
        "waiting": "Have you made room for all the contributions at Party Beach?",
        "ready": "The neighbours sent word that the table is set. Is Rowan's place ready too?",
        "report": "Everything is laid out, and Rowan has a place among the neighbours.",
        "reply": "That is what I hoped for. Wild Will is beside the southern Party Beach shore. Go and join him; he has kept room for you too.",
        "where": {
            "table": "At the long table in central Party Beach, between the baker and the forest neighbour."
        }
    },
    "LONG_TABLE": {
        "topic": "There is a place for every community now. May I join you?",
        "offer": "Of course. Come over to the table’s lanterns. Someone has saved a place for you, after all that walking.",
        "question": "What makes a gathering feel like home?",
        "answer": "Being expected. Hearing your name when you arrive. And someone passing the bread before you have to ask.",
        "accept": "I will join the neighbours by the lanterns.",
        "waiting": "Come over to the long table when you are ready. I saved you a place.",
        "ready": "There you are. After all that walking, how does it feel to find everyone at one table?",
        "report": "It feels like the invitations finally reached the people they were meant for.",
        "reply": "Then sit with us. Tomorrow there will be more roads to walk, but tonight there is bread, company and a place for you.",
        "where": {
            "gather": "At the lanterns on the long table in central Party Beach, north of my usual shore."
        }
    },
    "WATCH_RELIEF": {
        "topic": "You left the first picnic early. Can I help you get an evening off?",
        "offer": "I would like that. But somebody has to cover the gate. Ask Bstrat on her Town rounds, or at the guesthouse after supper, whether she can arrange a relief volunteer.",
        "question": "Was the safe path not enough?",
        "answer": "It made the picnic possible. It did not remove the gate from my patrol. I need another pair of eyes before I can leave it for an evening.",
        "accept": "I will ask someone to cover the gate.",
        "waiting": "Did Bstrat find someone who can take a relief round?",
        "ready": "You found a volunteer? Can they cover the gate?",
        "report": "A neighbour agreed to take your relief round.",
        "reply": "An actual evening off. That sounds good. Let us mark my usual stops so the volunteer knows what to check.",
        "where": {
            "relief": "At the relief post just south of the eastern Town gate, beside my gate rounds."
        }
    },
    "WATCH_ROUND": {
        "topic": "Where should I mark the volunteer's patrol?",
        "offer": "The market stop and the southern Forest approach. Those are the two places I check between gate rounds. Mark both, so our volunteer does not have to guess.",
        "question": "What does the volunteer need to watch for?",
        "answer": "Stragglers at the market and walkers coming out of Forest. A clear route matters more than promising that nothing will happen.",
        "accept": "I will mark both of your usual stops.",
        "waiting": "Are the market and Forest stops both marked?",
        "ready": "Both stops are ready? Tell me where the volunteer will check.",
        "report": "The market stop and the southern Forest approach are marked.",
        "reply": "Good. They can follow my usual round now. Once the lantern road is open, I can accept a whole evening at the table.",
        "where": {
            "market": "At the Town market patrol stop, west of the eastern gate.",
            "forest": "At Forest's southern entrance, just north of Town."
        }
    },
    "WATCH_INVITED": {
        "topic": "The road is open. Will you stay for the whole gathering?",
        "offer": "Yes, if our volunteer has the rota. Confirm the rota with Bstrat, and I can hand over without leaving anyone waiting.",
        "question": "Will the gate still be watched all evening?",
        "answer": "It will. You found a volunteer and marked a real round. That is why I can say yes this time.",
        "accept": "I will leave the rota with your volunteer.",
        "waiting": "Has the relief volunteer received the rota?",
        "ready": "The rota is handed over? Then I can put this patrol book down.",
        "report": "The volunteer has your rota and knows the round.",
        "reply": "Save me a place. I am staying for the whole evening this time, thanks to the relief patrol you arranged.",
        "where": {
            "rota": "At the relief post beside the eastern Town gate, where you first asked for a volunteer."
        }
    },
    "MISSING_MESSAGES": {
        "topic": "What about the families who cannot come?",
        "offer": "We should ask what they would like, rather than decide for them. A family sent me a message this morning. Ask me about it when you are ready; their wishes deserve a proper conversation.",
        "question": "Should I try to persuade them to attend?",
        "answer": "No. An invitation should leave room to decline. Listen to what they ask us to carry instead.",
        "accept": "I would like to hear their message and respect their answer.",
        "waiting": "Have you heard what the graveyard family would like?",
        "ready": "You have their message? What did they ask us to do?",
        "report": "They want a lantern by the table, with no speeches about their grief.",
        "reply": "Then their private messages stay private. Nessa knows another family who cannot travel; ask her when the caravan route is ready.",
        "where": {
            "family": "At the family message place in northern Graveyard, north of the three-name memorial."
        }
    },
    "MISSING_KEEPSAKES": {
        "topic": "Vince said a caravan family cannot travel. Can we keep a place for them?",
        "offer": "They would like that. Their little keepsake lantern is packed at the dispatch cache. Could you carry it, without asking them to change their minds?",
        "question": "What keeps them here?",
        "answer": "Their own responsibilities. They do not owe the gathering an explanation. Sending something small is how they want to take part.",
        "accept": "I will take their lantern, just as they asked.",
        "waiting": "Have you collected the family's small lantern?",
        "ready": "The keepsake is safe? Were they comfortable sending it?",
        "report": "They sent the lantern and asked us to respect their decision to stay.",
        "reply": "I will wrap it for the journey. Take it to Vince when the road is open; he knows the graveyard family's wishes too.",
        "where": {
            "keepsake": "At the caravan dispatch cache east of our southern Desert camp."
        }
    },
    "MISSING_PLACES": {
        "topic": "I brought the families' wishes and their keepsake lantern.",
        "offer": "Let us keep a quiet place beside the long table. Set the lantern there. Nobody has to make a speech or explain an empty chair.",
        "question": "How will the neighbours know whose place it is?",
        "answer": "They can ask with care. We can remember the families without reading their private words aloud.",
        "accept": "I will set their lantern beside the table.",
        "waiting": "Is their lantern beside the long table?",
        "ready": "You have kept their place? Was it left quiet?",
        "report": "The lantern is set, and their private messages stayed private.",
        "reply": "Thank you for listening to what they actually wanted. There is a place for them without asking them to be here.",
        "where": {
            "place": "At the eastern end of the long table in central Party Beach."
        }
    },
    "WILL_SHORE": {
        "topic": "Adam is inviting neighbours. Would you like to come?",
        "offer": "Perhaps. The sea took my crew, and I still watch that landing when visitors come. Could you mark a safe approach on the northern Party Beach shore?",
        "question": "Would company help, or would you rather be alone?",
        "answer": "I do not know yet. A safe landing would help me decide without worrying about everyone who arrives.",
        "accept": "I will mark a safe landing for the neighbours.",
        "waiting": "Is the approach on the northern shore marked?",
        "ready": "You checked the landing? Can visitors find it safely?",
        "report": "The landing is marked. Visitors will know where to arrive.",
        "reply": "That takes one worry off my mind. There is a cup from my old crew on Beach. Would you help me bring it back?",
        "where": {
            "shore": "On Party Beach's northern landing, northeast along the shore from me."
        }
    },
    "WILL_KEEPSAKE": {
        "topic": "Tell me about the cup your crew left behind.",
        "offer": "It has our mark on it. The tide carried it onto the old Beach shore. I would like it here, but I do not quite trust myself to search alone.",
        "question": "What do you want the cup to remind you of?",
        "answer": "The ordinary evenings, before the loss. We passed it around and argued about who made the worst tea. I would like to remember that too.",
        "accept": "I will look for your crew's cup.",
        "waiting": "Have you found the cup on the old shore?",
        "ready": "That is our mark. Did the cup survive the tide?",
        "report": "I found your crew's cup. The mark is still there.",
        "reply": "Thank you. I can keep them close and still leave another chair free. When the road opens, I would like to ask Jimi to sit with me.",
        "where": {
            "keepsake": "On Beach, northwest along the shore from Jimi's landing."
        }
    },
    "WILL_NEIGHBOUR": {
        "topic": "The road is open. Shall I ask Jimi to join you?",
        "offer": "Please. Tell him I kept a chair for him, personally. I have spent enough evenings hoping somebody would guess I wanted company.",
        "question": "What should I tell him about your crew?",
        "answer": "That I still remember them. And that I would like to hear his stories too. He does not have to fill anybody else's place.",
        "accept": "I will carry your personal invitation to Jimi.",
        "waiting": "Did Jimi hear the invitation?",
        "ready": "You spoke to him? What did he say?",
        "report": "Jimi accepted. He knows you kept a chair for him.",
        "reply": "Then I had better save some bread. Thank you for carrying a personal invitation instead of making him guess.",
        "where": {
            "invite": "At Jimi's usual Beach landing. Give him the invitation there."
        }
    },
    "SPARK_TRAINING": {
        "topic": "What would you like to bring to the gathering?",
        "offer": "Something familiar, I think. Would you ask Bstrat what the neighbours would enjoy? I would rather hear what matters to them than arrive with a gift nobody wants.",
        "question": "Does the gathering need another gift?",
        "answer": "No. Coming along is enough. This is a small favour for an old friend, if you feel like taking it on.",
        "accept": "I will ask Bstrat what she remembers.",
        "waiting": "Did Bstrat mention something she would like to see again?",
        "ready": "You spoke to her? What did she ask for?",
        "report": "Your old copper lantern. She remembers it beside the evening baskets.",
        "reply": "That old thing! I kept it in Megamag’s store. If you are willing to fetch it, I will polish it for her.",
        "where": {
            "practice": "Speak to Bstrat around the Town market or in the guesthouse east of it."
        }
    },
    "SPARK_TOOL": {
        "topic": "Bstrat remembers your copper lantern. Where did you put it?",
        "offer": "In Megamag’s store, through its existing northern Lavaland entrance. The approach is guarded. Take your time; it is a keepsake for the table, not a condition for joining us.",
        "question": "What does she remember about it?",
        "answer": "We used to share stories beside it after the baskets were packed. The copper went green in the rain; Bstrat always said it was more handsome that way.",
        "accept": "I will look for the old lantern.",
        "waiting": "Have you found the copper lantern?",
        "ready": "That is its old handle. Is my little knot still on it?",
        "report": "Here is your lantern. The knot is still on the handle.",
        "reply": "Thank you. I will polish it just enough to shine, and leave a little green for Bstrat. Some gifts are better for having been used.",
        "where": {
            "tool": "Inside Megamag, through the existing northern Lavaland entrance. Follow the guarded route to the old lantern’s resting place."
        }
    }
};
module.exports = Object.fromEntries(Object.entries(conversations).map(([id, lines]) => ['LANTERN_' + id, lines]));
