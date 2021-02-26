async function fetchGraphQL(operationsDoc, operationName, variables) {
  const result = await fetch('https://hasura-ifk5.onrender.com/v1/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({
      query: operationsDoc,
      variables: variables,
      operationName: operationName,
    }),
  });

  return await result.json();
}

const operationsDoc = `
  query MyQuery($id: String!) {
    users_by_pk(id: $id) {
      id
      name
    }
  }
`;

export function fetchMyQuery(id) {
  return fetchGraphQL(operationsDoc, 'MyQuery', { id: id });
}

// async function startFetchMyQuery(id) {
//   const { errors, data } = await fetchMyQuery(id);

//   if (errors) {
//     // handle those errors like a pro
//     console.error(errors);
//   }

//   // do something great with this precious data
//   console.log(data);
// }
