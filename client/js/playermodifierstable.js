class PlayerModifiersTable extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const value = JSON.parse(this.getAttribute('value'));
        const playerClass = value['playerClass'];
        const title = playerClass.charAt(0).toUpperCase() + playerClass.slice(1);

        this.shadowRoot.innerHTML = `
            <style>
                table {
                    width: 100%;
                    margin-top: 10px;
                    border-collapse: collapse;
                }
                table, th, td {
                    border: 1px solid #ccc;
                    padding: 5px;
                    text-align: center;
                }
                h3 {
                    margin: 0;
                    padding: 0 0 10px 0;
                    text-align: center;
                }
                th {
                    background-color: black
                }
            </style>
            <h3>Class: ${title}</h3>
            <table>
                <tr><th>Attribute</th><th>Modifier</th></tr>
                <tr><td>Melee Damage Dealt</td><td>${value.meleeDamageDealt}</td></tr>
                <tr><td>Melee Damage Taken</td><td>${value.meleeDamageTaken}</td></tr>
                <tr><td>Move Speed</td><td>${value.moveSpeed}</td></tr>
                <tr><td>Ranged Damage Dealt</td><td>${value.rangedDamageDealt}</td></tr>
                <tr><td>HP Regen</td><td>${value.hpRegen}</td></tr>
                <tr><td>Max HP</td><td>${value.maxHp}</td></tr>
                <tr><td>Hate</td><td>${value.hate}</td></tr>
                <tr><td>Attack Rate</td><td>${value.attackRate}</td></tr>
                <tr><td>Stealth</td><td>${value.stealth}</td></tr>
            </table>
        `;
    }
}

customElements.define('modifiers-table', PlayerModifiersTable);