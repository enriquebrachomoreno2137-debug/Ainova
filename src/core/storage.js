export const getStorage = (key, initialValue) => {
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  } catch (error) {
    console.error(error);
    return initialValue;
  }
};

export const setStorage = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(error);
  }
};

export const removeStorage = (key) => {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error(error);
  }
};

export const orgKey = (orgType, orgId, key) => `${orgType}_${orgId}_${key}`;
