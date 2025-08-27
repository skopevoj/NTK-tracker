const { getOccupancyHistory, highestOccupancy, currentOccupancy, getDailyAverages } = require("../db/occupancy");

const rootValue = {
  occupancyHistory: async ({ limit }) => await getOccupancyHistory(limit || 50),
  weeklyAverage: async ({ startDate, endDate }) => await weeklyAverage(startDate, endDate),
  monthlyAverage: async ({ month }) => await monthlyAverage(month),
  highestOccupancy: async () => await highestOccupancy(),
  currentOccupancy: async () => await currentOccupancy(),
  dailyAverages: async ({ lastDays }) => await getDailyAverages(lastDays || 365),
};

module.exports = rootValue;
