const { buildSchema } = require("graphql");

// This defines the GraphQL types and available queries
const schema = buildSchema(`
  type Occupancy {
    id: Int
    timestamp: String
    people_count: Int
  }

  type Query {
    occupancyHistory(limit: Int): [Occupancy]
  }
`);

module.exports = schema;
