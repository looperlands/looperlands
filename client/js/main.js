
define(['jquery', 'app'], function($, App) {
    var app, game;

    let gamepadHandler = undefined;

    var initApp = function() {
        $(document).ready(function() {
        	app = new App();

            app.center();

            app.storage.loadData().then((data) => {

                $("#welcome").hide();

                if(Detect.isWindows()) {
                    // Workaround for graphical glitches on text
                    $('body').addClass('windows');
                }
                
                if(Detect.isOpera()) {
                    // Fix for no pointer events
                    $('body').addClass('opera');
                }
            
                $('body').click(function(event) {
                    if($('#parchment').hasClass('credits')) {
                        app.toggleCredits();
                    }
                    
                    if($('#parchment').hasClass('about')) {
                        app.toggleAbout();
                    }

                    if($('#parchment').hasClass('settings')) {
                        app.toggleSettings();
                    }                    
                });
        
                $('.barbutton').click(function() {
                    $(this).toggleClass('active');
                });
        
                $('#chatbutton').click(function() {
                    if($('#chatbutton').hasClass('active')) {
                        app.showChat();
                    } else {
                        app.hideChat();
                    }
                });
        
                $('#helpbutton').click(function() {
                    app.toggleAbout();
                });
        
                $('#achievementsbutton').click(function() {
                    app.toggleAchievements();
                    if(app.blinkInterval) {
                        clearInterval(app.blinkInterval);
                    }
                    $(this).removeClass('blink');
                });
        
                $('#instructions').click(function() {
                    app.hideWindows();
                });
                
                $('#playercount').click(function() {
                    app.togglePopulationInfo();
                });
                
                $('#population').click(function() {
                    app.togglePopulationInfo();
                });

                $('#weapon').click(function(event) {
                    app.toggleWeaponInfo(event)

                    return false;
                });

                $('#armor').click(function(event) {
                    app.toggleAvatarInfo(event)

                    return false;
                });
        
                $('.clickable').click(function(event) {
                    event.stopPropagation();
                });
        
                $('#toggle-credits').click(function() {
                    $('body').removeClass('death').addClass('credits');

                    let canvas = document.getElementById('creditsCanvas'),
                    context = canvas.getContext('2d'),
                    namesPosition = -50,
                    scrollUp = setInterval(function(){
                        namesPosition-= 1;
                        context.clearRect(0, 0, canvas.width, canvas.height);
                        context.beginPath();
                        ctx.globalAlpha = 0.2;
                        ctx.globalAlpha = 1.0;
                        context.closePath();
            
                        context.beginPath();
                        context.shadowColor = '#000';
                        context.shadowBlur = 5;
                        context.shadowOffsetX = 3;
                        context.shadowOffsetY = 3;
                        context.fillStyle = 'black';
                        context.fillText('Smileyphase - LoopWorms Lead/Platform',100,200+namesPosition);
                        context.fillText('Balkshamster - Lead Developer',100,230+namesPosition);
                        context.fillText('Kofit - LoopWorms Founder',100,260+namesPosition);                        
                        context.fillText('Peteszah - Community Growth',100,290+namesPosition);
                        context.fillText('ADammmHill - Head of Events/Tester',100,320+namesPosition);
                        context.fillText('Oracle - Hype Queen',100,350+namesPosition);
                        context.fillText('WizKing - Artist Tester',100,380+namesPosition);
                        context.fillText('Veni - Game Developer',100,410+namesPosition);
                        context.fillText('Bertle - Community Engagement',100,440+namesPosition);
                        context.fillText('Art Magic - Community Help',100,470+namesPosition);
                        context.fillText('Izitnu - Creator Advisory Board/Documentation',100,500+namesPosition);
                        context.fillText('Ordinary Adam - Creator Advisory Board',100,530+namesPosition);
                        context.fillText('Sage - Creator Advisory Board',100,560+namesPosition);
                        context.closePath();
                        if(namesPosition <= -440){
                            namesPosition = -50;
                        }
                    },62);                    
                });
        
                $('#create-new span').click(function() {
                    app.animateParchment('loadcharacter', 'confirmation');
                });
        
                $('.delete').click(function() {
                    app.storage.clear();
                    app.animateParchment('confirmation', 'createcharacter');
                });
        
                $('#cancel span').click(function() {
                    app.animateParchment('confirmation', 'loadcharacter');
                });
                
                $('.ribbon').click(function() {
                    app.toggleAbout();
                });

                $('#nameinput').bind("keyup", function() {
                    app.toggleButton();
                });
        
                $('#previous').click(function() {
                    if(app.currentPage === 1) {
                        $('#lists').css({left: 0});
                        return false;
                    } else {
                        app.currentPage -= 1;

                        let margin = parseInt($('#achievements-wrapper').css('marginLeft')) + parseInt($('#achievements-wrapper').css('marginRight'));
                        let width = $('#achievements-wrapper').width();

                        $('#lists').css({left: -1 * ((app.currentPage -1) * (width + margin))});
                    }
                });
        
                $('#next').click(function() {
                    var $lists = $('#lists'),
                        nbPages = $lists.children('ul').length;
            
                    if(app.currentPage === nbPages) {
                        $lists.css({left: 0});
                        app.currentPage = 1;
                        return false;
                    } else {
                        app.currentPage += 1;
                        let margin = parseInt($('#achievements-wrapper').css('marginLeft')) + parseInt($('#achievements-wrapper').css('marginRight'));
                        let width = $('#achievements-wrapper').width();

                        $lists.css({left: -1 * ((app.currentPage -1)* (width + margin))});
                    }
                });

                $('#notifications div').bind(TRANSITIONEND, app.resetMessagesPosition.bind(app));
        
                $('.close').click(function() {
                    app.hideWindows();
                });
            
                $('.twitter').click(function() {
                    var url = $(this).attr('href');

                app.openPopup('twitter', url);
                return false;
                });

                $('.facebook').click(function() {
                    var url = $(this).attr('href');

                app.openPopup('facebook', url);
                return false;
                });
            
                var data = app.storage.data;
                app.tryStartingGame(data.player.name, data.mapId);
                if(data.hasAlreadyPlayed) {
                    if(data.player.name && data.player.name !== "") {
                        $('#playername').html(data.player.name);
                        $('#playerimage').attr('src', data.player.image);
                    }
                }
                
                $('.play div').click(function(event) {
                    var nameFromInput = $('#nameinput').val(),
                        nameFromStorage = $('#playername').html(),
                        name = nameFromInput || nameFromStorage;
                    
                    app.tryStartingGame(name, data.mapId);
                });

                $('#fishingbar').click(function() {
                    app.game.clickFishingBar();
                });
            
                document.addEventListener("touchstart", function() {},false);
                
                $('#resize-check').bind("transitionend", app.resizeUi.bind(app));
                $('#resize-check').bind("webkitTransitionEnd", app.resizeUi.bind(app));
                $('#resize-check').bind("oTransitionEnd", app.resizeUi.bind(app));

                document.addEventListener("visibilitychange", () => {
                    if (document.visibilityState === 'hidden') {
                        app.game.windowHidden = true;
                        setTimeout(app.game.tick.bind(app.game), 60);
                    } else {
                        app.game.windowHidden = false;
                    }
                });

                console.log("App initialized.");
            
                initGame(data.mapId);
            }).catch((error) => {
                console.error(error);
                if (error.response.status === 404) {
                    $("#welcomeMessage").text("Session not found. Make sure you don't have two LooperLands open.");
                } else {
                    $("#welcomeMessage").text("Error loading your user data. Please try again later.");
                }
                window.location.href = "https://looperlands.io";
            });
        });
    };
    
    var initGame = function(mapId) {
        require(['game'], function(Game) {
            
            var canvas = document.getElementById("entities"),
        	    background = document.getElementById("background"),
        	    foreground = document.getElementById("foreground"),
        	    input = document.getElementById("chatinput");

    		game = new Game(app);
    		game.setup('#bubbles', canvas, background, foreground, input);
    		game.setStorage(app.storage);
    		app.setGame(game);
    		
    		if(app.isDesktop && app.supportsWorkers) {
    		    game.loadMap(mapId);
    		}
	
    		game.onGameStart(function() {
                app.initEquipmentIcons();
                keyboardHandler = new KeyBoardHandler(game);
                game.gamepadListener = new GamePadListener(game);
    		});
    		
    		game.onDisconnect(function(message) {
    		    if($('body').hasClass('credits')) {
    		        $('body').removeClass('credits');
    		    }

                if($('body').hasClass('about')) {
                    $('body').removeClass('about');
                }

                $('body').addClass('death');
    		    $('#death').find('p').html(message+"<em>Press Browser Back Button.</em>");
    		    $('#respawn').hide();
    		});
	
    		game.onPlayerDeath(function() {
    		    if($('body').hasClass('credits')) {
    		        $('body').removeClass('credits');
    		    }
                $('body').addClass('death');
    		});
	
    		game.onPlayerEquipmentChange(function() {
    		    app.initEquipmentIcons();
    		});
	
    		game.onPlayerInvincible(function() {
    		    $('#hitpoints').toggleClass('invincible');
    		});

    		game.onNbPlayersChange(function(worldPlayers, totalPlayers) {
    		    var setWorldPlayersString = function(string) {
        		        $("#instance-population").find("span:nth-child(2)").text(string);
        		        $("#playercount").find("span:nth-child(2)").text(string);
        		    },
        		    setTotalPlayersString = function(string) {
        		        $("#world-population").find("span:nth-child(2)").text(string);
        		    };
    		    
    		    $("#playercount").find("span.count").text(worldPlayers);
    		    
    		    $("#instance-population").find("span").text(worldPlayers);
    		    if(worldPlayers == 1) {
    		        setWorldPlayersString("player");
    		    } else {
    		        setWorldPlayersString("players");
    		    }
    		    
    		    $("#world-population").find("span").text(totalPlayers);
    		    if(totalPlayers == 1) {
    		        setTotalPlayersString("player");
    		    } else {
    		        setTotalPlayersString("players");
    		    }
    		});
	
    		game.onAchievementUnlock(function(questName, endText, xpReward, medal) {
    		    app.unlockAchievement(questName, endText, xpReward, medal);
    		});
	
    		game.onNotification(function(message) {
    		    app.showMessage(message);
    		});
	
            app.initHealthBar();
	
            $('#nameinput').val('');
    		$('#chatbox').attr('value', '');
    		
        	if(game.renderer.mobile || game.renderer.tablet) {
                $('#foreground').bind('touchstart', function(event) {
                    app.center();
                    app.setMouseCoordinates(event.originalEvent.touches[0]);
                	game.click();
                	app.hideWindows();
                });
            } else {
                $('#foreground').click(function(event) {
                    app.center();
                    app.setMouseCoordinates(event);
                    if(game) {
                	    game.click();
                	}
                	app.hideWindows();
                    // $('#chatinput').focus();
                });
            }

            // Zoom game area to fill 95% of window size.
            window.onresize = () => {
                if (!app.settings.getFullscreen()) {
                    return;
                }
                $("#container").css('transform', 'scale(' + Math.min(($(window).width() / $("#container").width() * 0.95), ($(window).height() / $("#container").height() * 0.95)) + ')');
            }
            if (app.settings.getFullscreen()) {
                $("#container").css('transform', 'scale(' + Math.min(($(window).width() / $("#container").width() * 0.95), ($(window).height() / $("#container").height() * 0.95)) + ')')
            }

            $('body').unbind('click');
            $('body').click(function(event) {
                var hasClosedParchment = false;
                
                if($('#parchment').hasClass('credits')) {
                    if(game.started) {
                        app.closeInGameCredits();
                        hasClosedParchment = true;
                    } else {
                        app.toggleCredits();
                    }
                }
                
                if($('#parchment').hasClass('about')) {
                    if(game.started) {
                        app.closeInGameAbout();
                        hasClosedParchment = true;
                    } else {
                        app.toggleAbout();
                    }
                }
                
                if(game.started && !game.renderer.mobile && game.player && !hasClosedParchment) {
                    game.click();
                }
            });
            
            $('#respawn').click(function(event) {
                game.audioManager.playSound("revive");
                game.restart();
                $('body').removeClass('death');
            });
            
            $(document).mousemove(function(event) {
            	app.setMouseCoordinates(event);
            	if(game.started) {
            	    game.movecursor();
            	}
            });

            $(document).keydown(function(e) {
            	var key = e.which;

                if(key === 13) {
                    if($('#chatbox').hasClass('active')) {
                        app.hideChat();
                    } else {
                        app.showChat();
                    }
                }
            });
            
            $('#chatinput').keydown(function(e) {
                var key = e.which,
                    chat_el = $('#chatinput');

                if(key === 13) {
                    if(chat_el.val().replace(/\s/g, '').length) {
                        if(game.player) {
                            game.say(chat_el.val());
                            chat_el.val("");
                        }
                        app.hideChat();
                        $('#foreground').focus();
                        return false;
                    } else {
                        app.hideChat();
                        return false;
                    }
                    chat_el.val("");
                }
                
                if(key === 27) {
                    app.hideChat();
                    return false;
                }
            });

            $('#nameinput').keypress(function(event) {
                var name_el = $('#nameinput'),
                    name = name_el.val();


                if(event.keyCode === 13) {
                    if(name !== '') {
                        app.tryStartingGame(name, function() {
                            name_el.blur(); // exit keyboard on mobile
                        });
                        return false; // prevent form submit
                    } else {
                        return false; // prevent form submit
                    }
                }
            });
            
            $('#mutebutton').click(function() {
                game.app.toggleSettings();
            });
            
            $(document).bind("keydown", function(e) {
            	var key = e.which,
            	    $chat = $('#chatinput');

                if($('#chatinput:focus').size() == 0 && $('#nameinput:focus').size() == 0) {
                    if(key === 13) { // Enter
                        if(game.ready) {
                            $chat.focus();
                            return false;
                        }
                    }
                    if(key === 32) { // Space
                        // game.togglePathingGrid();
                        return false;
                    }
                    if(key === 70) { // F
                        // game.toggleDebugInfo();
                        return false;
                    }
                    if(key === 27) { // ESC
                        app.hideWindows();
                        /*_.each(game.player.attackers, function(attacker) {
                            attacker.stop();
                        });*/
                        return false;
                    }
                    if(key === 65) { // a
                        // game.player.hit();
                        return false;
                    }
                } else {
                    if(key === 13 && game.ready) {
                        $chat.focus();
                        return false;
                    }
                }
            });
            
            if(game.renderer.tablet) {
                $('body').addClass('tablet');
            }
        });
    };
    
    initApp();
});