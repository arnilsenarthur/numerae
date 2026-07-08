let dropdownEscapeLocks = 0;

export function registerDropdownEscapeLock() {
  dropdownEscapeLocks += 1;
  return () => {
    dropdownEscapeLocks = Math.max(0, dropdownEscapeLocks - 1);
  };
}

export function hasDropdownEscapeLock() {
  return dropdownEscapeLocks > 0;
}
