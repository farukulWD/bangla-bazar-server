//models
const Setting = require("../../models/Setting");

const getGlobalSetting = async (data) => {
  try {
    const globalSetting = await Setting.findOne({
      name: "globalSetting",
    });
    return globalSetting?.setting;
  } catch (err) {
    console.log("err when getting global setting", err.message);
  }
};

const getStoreCustomizationSetting = async (data) => {
  try {
    const storeCustomizationSetting = await Setting.findOne({
      name: "storeCustomizationSetting",
    });
    return storeCustomizationSetting?.setting;
  } catch (err) {
    console.log("err when storeCustomizationSetting setting", err.message);
  }
};

module.exports = {
  getGlobalSetting,
  getStoreCustomizationSetting,
};
