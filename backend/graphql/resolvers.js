const {
  getOccupancyHistory,
  highestOccupancy,
  currentOccupancy,
  getDailyAverages,
  getWeeklyAverages,
} = require("../db/occupancy");

const rootValue = {
  occupancyHistory: async ({ limit }) => await getOccupancyHistory(limit || 50),
  weeklyAverage: async ({ startDate, endDate }) => await weeklyAverage(startDate, endDate),
  monthlyAverage: async ({ month }) => await monthlyAverage(month),
  highestOccupancy: async () => await highestOccupancy(),
  currentOccupancy: async () => await currentOccupancy(),
  dailyAverages: async ({ lastDays }) => await getDailyAverages(lastDays || 365),
  weeklyAverages: async () => await getWeeklyAverages(),
};

module.exports = rootValue;
