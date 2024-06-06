const { PlayerClassModifiers } = require('./playerclassmodifiers.js');

describe('PlayerClassModifiers', () => {
    let platformClientMock;
    let modifiers;
    let playerClassModifiers;

    beforeEach(() => {
        platformClientMock = {
            getLooperModifierData: jest.fn()
        };
        modifiers = {
            meleeDamageDealt: 1,
            meleeDamageTaken: 1,
            moveSpeed: 1,
            rangedDamageDealt: 1,
            hpRegen: 1,
            maxHp: 1,
            hate: 1,
            attackRate: 1,
            stealth: 1
        };
        platformClientMock.getLooperModifierData.mockResolvedValue(modifiers);

        playerClassModifiers = new PlayerClassModifiers(platformClientMock, 'nft1', 'fighter');
    });

    describe('loadModifierData', () => {
        it('should load modifier data from platformClient', async () => {
            await playerClassModifiers.loadModifierData();

            expect(platformClientMock.getLooperModifierData).toHaveBeenCalledWith('nft1');
            expect(playerClassModifiers._meleeDamageDealt).toBe(modifiers.meleeDamageDealt);
            expect(playerClassModifiers._meleeDamageTaken).toBe(modifiers.meleeDamageTaken);
            expect(playerClassModifiers._moveSpeed).toBe(modifiers.moveSpeed);
            expect(playerClassModifiers._rangedDamageDealt).toBe(modifiers.rangedDamageDealt);
            expect(playerClassModifiers._hpRegen).toBe(modifiers.hpRegen);
            expect(playerClassModifiers._maxHp).toBe(modifiers.maxHp);
            expect(playerClassModifiers._hate).toBe(modifiers.hate);
            expect(playerClassModifiers._attackRate).toBe(modifiers.attackRate);
            expect(playerClassModifiers._stealth).toBe(modifiers.stealth);
        });
    });

    describe('getters', () => {
        it('should return correct player class', () => {
            expect(playerClassModifiers.playerClass).toBe('fighter');
        });

        it('should return correct melee damage dealt', () => {
            expect(playerClassModifiers.meleeDamageDealt).toBe(1); // default value before loadModifierData is called
        });

        it('should return correct melee damage taken', () => {
            expect(playerClassModifiers.meleeDamageTaken).toBe(1); // default value before loadModifierData is called
        });

        it('should return correct move speed', () => {
            expect(playerClassModifiers.moveSpeed).toBe(1); // default value before loadModifierData is called
        });

        it('should return correct ranged damage dealt', () => {
            expect(playerClassModifiers.rangedDamageDealt).toBe(1); // default value before loadModifierData is called
        });

        it('should return correct hp regen', () => {
            expect(playerClassModifiers.hpRegen).toBe(1); // default value before loadModifierData is called
        });

        it('should return correct max hp', () => {
            expect(playerClassModifiers.maxHp).toBe(1); // default value before loadModifierData is called
        });

        it('should return correct hate', () => {
            expect(playerClassModifiers.hate).toBe(1); // default value before loadModifierData is called
        });

        it('should return correct attack rate', () => {
            expect(playerClassModifiers.attackRate).toBe(1); // default value before loadModifierData is called
        });

        it('should return correct stealth', () => {
            expect(playerClassModifiers.stealth).toBe(1); // default value before loadModifierData is called
        });

        describe('emoji', () => {
            it('should return correct emoji for fighter', () => {
                playerClassModifiers._playerClass = 'fighter';
                expect(playerClassModifiers.emoji).toBe('🗡️');
            });

            it('should return correct emoji for ranger', () => {
                playerClassModifiers._playerClass = 'ranger';
                expect(playerClassModifiers.emoji).toBe('🏹');
            });

            it('should return correct emoji for tank', () => {
                playerClassModifiers._playerClass = 'tank';
                expect(playerClassModifiers.emoji).toBe('🛡️');
            });

            it('should return correct emoji for rogue', () => {
                playerClassModifiers._playerClass = 'rogue';
                expect(playerClassModifiers.emoji).toBe('🥷');
            });

            it('should return undefined for unknown class', () => {
                playerClassModifiers._playerClass = 'unknown';
                expect(playerClassModifiers.emoji).toBeUndefined();
            });
        });
    });

    describe('setters', () => {
        it('should set player class if it is null', () => {
            playerClassModifiers._playerClass = null;
            playerClassModifiers.playerClass = 'ranger';
            expect(playerClassModifiers.playerClass).toBe('ranger');
        });

        it('should not change player class if it is already set', () => {
            playerClassModifiers.playerClass = 'tank';
            expect(playerClassModifiers.playerClass).toBe('fighter'); // remains 'fighter' as it was initially set
        });
    });

    describe('getAllModifiers', () => {
        it('should return all modifiers after loading data', async () => {
            await playerClassModifiers.getAllModifiers();

            expect(platformClientMock.getLooperModifierData).toHaveBeenCalledWith('nft1');
            const expectedModifiers = {
                playerClass: 'fighter',
                meleeDamageDealt: modifiers.meleeDamageDealt,
                meleeDamageTaken: modifiers.meleeDamageTaken,
                moveSpeed: modifiers.moveSpeed,
                rangedDamageDealt: modifiers.rangedDamageDealt,
                hpRegen: modifiers.hpRegen,
                maxHp: modifiers.maxHp,
                hate: modifiers.hate,
                attackRate: modifiers.attackRate,
                stealth: modifiers.stealth,
                emoji: '🗡️'
            };
            expect(await playerClassModifiers.getAllModifiers()).toEqual(expectedModifiers);
        });
    });
});
