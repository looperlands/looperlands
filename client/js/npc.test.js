const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.Types = {};
const Types = require('../../shared/js/gametypes');

function createNpc(animations = ['idle_down'], clock = Date) {
    let methods;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'npc.js'), 'utf8'), {
        Types, Date: clock, define: (dependencies, factory) => { methods = factory({extend: value => value}); }, setTimeout
    });
    return {...methods, orientation: Types.Orientations.DOWN, idleSpeed: 450, isLoaded: true,
        _super: jest.fn(), hasAnimation: name => animations.includes(name), setAnimation: jest.fn(),
        currentAnimation: {setSpeed: jest.fn()}, setOrientation: jest.fn(), isMoving: () => false, idle: jest.fn()};
}

test('front-facing NPCs safely reuse idle frames for all walking directions', () => {
    const npc = createNpc();
    for (const direction of Object.values(Types.Orientations)) {
        npc.orientation = direction;
        npc.animate('walk', 100);
        expect(npc.setAnimation).toHaveBeenLastCalledWith('idle_down', 180, undefined, undefined);
    }
    expect(npc._super).not.toHaveBeenCalled();
});

test('directional sprites retain their normal walking animation', () => {
    const npc = createNpc(['walk_right', 'idle_down']);
    npc.orientation = Types.Orientations.LEFT;
    npc.animate('walk', 100);
    expect(npc._super).toHaveBeenCalledWith('walk', 100, undefined, undefined);
});

test('idle frames slow down again after walking with a legacy sprite', () => {
    const npc = createNpc();
    npc.animate('walk', 100);
    expect(npc.currentAnimation.setSpeed).toHaveBeenLastCalledWith(180);
    npc.animate('idle', 450);
    expect(npc.currentAnimation.setSpeed).toHaveBeenLastCalledWith(450);
});

test('late-spawn behaviour state restores the NPC name, speed and orientation', () => {
    const npc = createNpc();
    npc.applyBehaviorState({key: 'watch', label: 'Town Watch', moveSpeed: 450,
        orientation: Types.Orientations.LEFT, activity: 'watching'});
    expect(npc.behaviorControlled).toBe(true);
    expect(npc.name).toBe('Town Watch');
    expect(npc.moveSpeed).toBe(450);
    expect(npc.setOrientation).toHaveBeenCalledWith(Types.Orientations.LEFT);
    expect(npc.idle).toHaveBeenCalled();
    npc.applyBehaviorState(undefined);
    expect(npc.name).toBe('Town Watch');
});

test('finishing legacy dialogue returns a blank step and can start again', () => {
    const npc = createNpc();
    npc._super = (id, kind) => { npc.kind = kind; };
    npc.init(1, Types.Entities.VILLAGER);
    for (let index = 0; index < npc.talkCount; index++) expect(npc.talk('wallet')).toBeTruthy();
    expect(npc.talk('wallet')).toBeNull();
    expect(npc.talk('wallet')).toBeTruthy();
});


test('the first interaction after returning to an NPC works without a second key press', () => {
    let now = 1000;
    const npc = createNpc(undefined, {now: () => now});
    npc._super = (id, kind) => {npc.kind = kind;};
    npc.init(1, Types.Entities.VILLAGER);
    expect(npc.hasInteraction()).toBe(true);
    npc.hasTalked();
    expect(npc.hasInteraction()).toBe(false);
    now += 499;
    expect(npc.hasInteraction()).toBe(false);
    now += 1;
    expect(npc.hasInteraction()).toBe(true);
    npc.hasTalked(); now += 10000;
    expect(npc.hasInteraction()).toBe(true);
});

test('placed story NPCs remain available for remembered conversations without a quest indicator', () => {
    const npc = createNpc();
    npc.thoughts = []; npc.itemKind = 'villagegirl'; npc.showIndicator = false;
    npc.applyBehaviorState({key: 'desert-courier', label: 'Nessa'});
    expect(npc.hasInteraction()).toBe(true);
});
