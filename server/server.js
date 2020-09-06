const { GraphQLServer, PubSub } = require("graphql-yoga");

const messages = [];
// subscription is used to avoid fetching the messages every 500ms even if there are no messages
const typeDefs = `
    type Message {
        id: ID!
        user: String!
        content: String!
    }

    type Query {
        messages: [Message!]                              
    }

    type Mutation {
        postMessage(user: String!, content: String!): ID!
    }

    type Subscription {
        messages: [Message!]
    }

`;

const subscribers = [];

const onMessagesUpdates = (fn) => subscribers.push(fn);

const resolvers = {
    Query: {
        messages: () => messages,
    },

    Mutation: {
        postMessage: (parent, { user, content }) => {
            const id = messages.length;
            messages.push({
                id,
                user,
                content,
            });
            // alert the system when new set of messages is out there
            subscribers.forEach((fn) => fn());
            return id;
        },
    },

    Subscription: {
        messages: {
            subscribe: (parent, args, { pubsub }) => {
                const channel = Math.random().toString(36).slice(2, 15);
                // sends the new subscriber the messages
                onMessagesUpdates(() => pubsub.publish(channel, { messages }));
                // set time out is used so that it's not necessary for a user to send a message for the new user to see the messages
                setTimeout(() => pubsub.publish(channel, { messages }), 0);
                return pubsub.asyncIterator(channel);
            },
        },
    },
};

const pubsub = new PubSub();
const server = new GraphQLServer({ typeDefs, resolvers, context: { pubsub } });

server.start(({ port }) => {
    console.log(`Server started on https://localhost:${port}`);
});
