const analyticsMethods = {
  logEvent: jest.fn(() => Promise.resolve()),
  logScreenView: jest.fn(() => Promise.resolve()),
};

const analytics = jest.fn(() => analyticsMethods);

module.exports = analytics;
module.exports.default = analytics;
