// Adapt the Emscripten 3.1.24 Embind DYNAMIC_EXECUTION=0 paths for the published
// Octave wrapper. See EMSCRIPTEN.LICENSE and PROVENANCE.md.
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const [input, output] = process.argv.slice(2);
assert(input && output && input !== output, 'Pass the original octave.js and a separate output path');
let code = readFileSync(input, 'utf8');
assert.equal(createHash('sha256').update(code).digest('hex'),
  '69f19646742a1e9598a24fe27b0928dd749b0df650b3a00f6fd58ef91bad9861',
  'Review the pinned wrapper before applying this source adaptation');

function replaceFunction(name, next, replacement) {
  const start = code.indexOf('function ' + name + '(');
  const end = code.indexOf('function ' + next + '(', start + 1);
  assert(start >= 0 && end > start, name);
  code = code.slice(0, start) + replacement.trim() + '\n' + code.slice(end);
}

replaceFunction('createNamedFunction', 'extendError', `
function createNamedFunction(name, body) {
  const wrapper = function() { "use strict"; return body.apply(this, arguments); };
  Object.defineProperty(wrapper, "name", {value: makeLegalFunctionName(name), configurable: true});
  return wrapper;
}`);

replaceFunction('craftInvokerFunction', 'ensureOverloadTable', `
function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc) {
  if (argTypes.length < 2) throwBindingError("An Embind signature needs return and receiver types");
  const hasReceiver = argTypes[1] !== null && classType !== null;
  const params = argTypes.slice(hasReceiver ? 1 : 2);
  const expected = argTypes.length - 2;
  const needsStack = params.some(type => type.destructorFunction === undefined);

  return createNamedFunction(humanName, function(...args) {
    if (args.length !== expected) {
      throwBindingError("Function " + humanName + " expects " + expected + " arguments, received " + args.length);
    }
    const destructors = needsStack ? [] : null;
    const values = hasReceiver ? [this, ...args] : args;
    const wire = params.map((type, index) => type.toWireType(destructors, values[index]));
    const result = cppInvokerFunc(cppTargetFunc, ...wire);
    if (needsStack) runDestructors(destructors);
    else params.forEach((type, index) => {
      if (type.destructorFunction !== null) type.destructorFunction(wire[index]);
    });
    if (argTypes[0].name !== "void") return argTypes[0].fromWireType(result);
  });
}`);

replaceFunction('emval_get_global', '__emval_get_global', `
function emval_get_global() {
  return globalThis;
}`);

replaceFunction('__emval_get_method_caller', '__emval_get_property', `
function __emval_get_method_caller(argCount, argTypes) {
  const [resultType, ...params] = emval_lookupTypes(argCount, argTypes);
  const signature = resultType.name + "_$" + params.map(type => type.name).join("_") + "$";
  const cached = emval_registeredMethods[signature];
  if (cached !== undefined) return cached;

  const caller = emval_addMethodCaller((receiver, name, destructors, pointer) => {
    const args = params.map(type => {
      const value = type.readValueFromPointer(pointer);
      pointer += type.argPackAdvance;
      return value;
    });
    const result = receiver[name](...args);
    params.forEach((type, index) => {
      if (type.deleteObject) type.deleteObject(args[index]);
    });
    if (!resultType.isVoid) return resultType.toWireType(destructors, result);
  });
  emval_registeredMethods[signature] = caller;
  return caller;
}`);

assert(!/new_\(Function|new Function\b|\beval\s*\(/.test(code), 'Unexpected dynamic execution in the wrapper');
writeFileSync(output, code, {flag: 'wx'});
