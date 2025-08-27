const { buildSchema } = require("graphql");

const schema = buildSchema(`
  type Occupancy {
    id: Int
    timestamp: String
    people_count: Int
  }

  type DailyAverage {
    date: String
    average: Float
  }

  type Query {
    occupancyHistory(limit: Int): [Occupancy]
    highestOccupancy: Occupancy
    currentOccupancy: Occupancy
    dailyAverages(lastDays: Int): [DailyAverage]
  }
`);

module.exports = schema;
