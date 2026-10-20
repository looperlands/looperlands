const {parse} = require('acorn');

// Only method bodies are mutable. Imports, constructors, startup callbacks,
// module state, signatures and protocol definitions remain part of the contract.
const POLICIES = Object.freeze({
    'server/js/entity.js': {kind: 'legacy', protected: ['init']},
    'server/js/character.js': {kind: 'legacy', protected: ['init']},
    'server/js/mob.js': {kind: 'legacy', protected: ['init']},
    'server/js/player.js': {kind: 'legacy', protected: ['init']},
    'server/js/worldserver.js': {kind: 'legacy', protected: ['init', 'run']},
    'server/js/combatcontroller.js': {kind: 'class', name: 'CombatController', protected: ['constructor', 'bind']},
    'server/js/combatfieldattacks.js': {kind: 'class', name: 'FieldAttacks', protected: ['constructor']},
    'server/js/formulas.js': {kind: 'object', name: 'Formulas', protected: []},
});

function canonical(node, bodies = new Set()) {
    if (!node || typeof node !== 'object') return node;
    if (bodies.has(node)) return {type: 'LiveMethodBody'};
    if (Array.isArray(node)) return node.map(value => canonical(value, bodies));
    return Object.fromEntries(Object.entries(node)
        .filter(([key]) => !['start', 'end', 'loc', 'range', 'raw'].includes(key))
        .map(([key, value]) => [key, canonical(value, bodies)]));
}

function describe(source, policy) {
    const ast = parse(source, {ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true});
    const methods = new Map();
    const add = (key, value, expression) => {
        if (policy.protected.includes(key)) return;
        if (methods.has(key)) throw new Error('Duplicate hot method: ' + key);
        methods.set(key, {body: value.body, expression});
    };
    if (policy.kind === 'class') {
        const declaration = ast.body.find(node => node.type === 'ClassDeclaration' && node.id.name === policy.name);
        if (!declaration) throw new Error('Expected class ' + policy.name);
        for (const method of declaration.body.body) {
            if (method.type !== 'MethodDefinition' || method.computed || method.static || method.kind !== 'method' || method.key.type !== 'Identifier') continue;
            const key = method.key.name;
            add(key, method.value, '({' + source.slice(method.start, method.end) + '})');
        }
    } else if (policy.kind === 'legacy') {
        const assignment = ast.body.find(node => node.type === 'ExpressionStatement' &&
            node.expression.type === 'AssignmentExpression' &&
            source.slice(node.expression.left.start, node.expression.left.end) === 'module.exports');
        let value = assignment?.expression.right;
        while (value?.type === 'AssignmentExpression') value = value.right;
        const object = value?.type === 'CallExpression' && value.arguments[0];
        if (object?.type !== 'ObjectExpression') throw new Error('Expected legacy class export');
        for (const property of object.properties) {
            if (property.type !== 'Property' || property.computed || property.key.type !== 'Identifier' || property.value.type !== 'FunctionExpression') continue;
            add(property.key.name, property.value, '(' + source.slice(property.value.start, property.value.end) + ')');
        }
    } else if (policy.kind === 'object') {
        for (const node of ast.body) {
            const assignment = node.type === 'ExpressionStatement' && node.expression;
            if (assignment?.type !== 'AssignmentExpression' || assignment.operator !== '=') continue;
            const member = assignment.left;
            if (member.type !== 'MemberExpression' || member.computed || member.object.name !== policy.name ||
                member.property.type !== 'Identifier' || assignment.right.type !== 'FunctionExpression') continue;
            add(member.property.name, assignment.right, '(' + source.slice(assignment.right.start, assignment.right.end) + ')');
        }
    }
    if (!methods.size) throw new Error('No supported hot methods');
    return {methods, shape: JSON.stringify(canonical(ast, new Set([...methods.values()].map(method => method.body))))};
}

module.exports = {POLICIES, describe};
