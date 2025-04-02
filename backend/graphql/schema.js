const { buildSchema } = require("graphql");

// This defines the GraphQL types and available queries
const schema = buildSchema(`
  type Occupancy {
    id: Int
    timestamp: String
    people_count: Int
  }

  type IntervalAverage {
    interval_start: String
    average_count: Float
  }

  

  type Query {
    occupancyHistory(limit: Int): [Occupancy]
    dailyAverage(date: String!): [IntervalAverage]
    weeklyAverage(startDate: String!, endDate: String!): [IntervalAverage]
    monthlyAverage(month: String!): [IntervalAverage]
  }


`);


module.exports = schema;
