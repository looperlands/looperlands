define(['../../shared/js/gametypes'], function () {
    return Class.extend({
        init: function (game) {
            this.game = game;
            this.stageDefinitions = {};
        },

        findCurrentStage: function (tileAction) {
            const url = '/session/' + this.game.sessionId + '/tileStage';
            return axios.post(url, {map: this.game.mapId, tileAction: tileAction})
                .then(function (response) {
                    return response.data;
                })
                .catch(function (error) {
                    console.error("Error while checking the trigger:", error);
                    throw error; // Ensure the error propagates
                });
        },

        executeStage: function (tileAction, stage, selectedItem) {
            if(!stage || stage.inProgress) {
                return;
            }

            if (selectedItem === undefined && stage.requirements && stage.requirements.items) {
                this.game.app.showSelectionPopup(stage.name, stage.requirements.items.map((item) => {
                    return {
                        value: item,
                        title: stage.itemChoices[item].title,
                        image: '/img/3/item-' + item + '.png',
                        count: stage.itemChoices[item].count,
                        disabled: (stage.itemChoices[item].count <= 0),
                        callback: (selectedItem) => {
                            this.executeStage(tileAction, stage, item);
                        }
                    };
                }));
            } else {
                if (stage.requirements && stage.requirements.tool && stage.playAnimation) {
                    let o = this.getTileOrientation(tileAction);
                    if(o === 'left') {
                        o = 'right';
                        this.game.player.flipSpriteX = true;
                    }
                    this.game.player.setAnimation('atk_' + o, this.game.player.atkSpeed);
                    setTimeout(() => {
                        this.game.player.idle();
                    }, (stage.duration) ? (stage.duration * 1000) : 1000);
                }
                const url = '/session/' + this.game.sessionId + '/tileStage/execute';
                return axios.post(url, {map: this.game.mapId, tileAction: tileAction, item: selectedItem})
            }
        },

        getTileOrientation: function (tileAction) {
            if(tileAction.gridX < this.game.player.gridX) {
                return 'left';
            } else if(tileAction.gridX > this.game.player.gridX) {
                return 'right';
            } else if(tileAction.gridY < this.game.player.gridY) {
                return 'up';
            } else if(tileAction.gridY > this.game.player.gridY) {
                return 'down';
            } else {
                return Types.getOrientationAsString(this.game.player.orientation);
            }
        }
    });
});