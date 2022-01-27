export function deepEqual(val1: any, val2: any) {
  const areObjects = isObject(val1) && isObject(val2)

  if (!areObjects) {
    return val1 === val2
  }

  if (Array.isArray(val1)) {
    if (!Array.isArray(val2)) {
      return false
    }
    for (const key in val1) {
      if (!deepEqual(val1[key], val2[key])) {
        return false
      }
    }
    return true
  }

  const keys1 = Object.keys(val1)
  const keys2 = Object.keys(val2)
  if (keys1.length !== keys2.length) {
    return false
  }
  for (const key of keys1) {
    const subval1 = val1[key];
    const subval2 = val2[key];
    const areObjects = isObject(val1) && isObject(val2);
    if (!deepEqual(val1, val2)) {
      return false
    }
  }
  return true
}

function isObject(object: any) {
  return object != null && typeof object === 'object';
}
