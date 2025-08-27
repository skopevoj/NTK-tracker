const { buildSchema } = require("graphql");

const schema = buildSchema(`
  type Occupancy {
    id: Int
    timestamp: String
    people_count: Int
  }

  type Query {
    occupancyHistory(limit: Int): [Occupancy]
    highestOccupancy: Occupancy
    currentOccupancy: Occupancy
  }
`);


module.exports = schema;
