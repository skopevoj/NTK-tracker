const { getOccupancyHistory, highestOccupancy, currentOccupancy } = require("../db/occupancy");

const rootValue = {
  occupancyHistory: async ({ limit }) => await getOccupancyHistory(limit || 50),
  weeklyAverage: async ({ startDate, endDate }) => await weeklyAverage(startDate, endDate),
  monthlyAverage: async ({ month }) => await monthlyAverage(month),
  highestOccupancy: async () => await highestOccupancy(),
  currentOccupancy: async () => await currentOccupancy(),
};

module.exports = rootValue;
