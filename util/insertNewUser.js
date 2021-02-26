/*
This is an example snippet - you should consider tailoring it
to your service.
*/

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
  mutation INSERT_NEW_USER($id: String!, $name: String!) {
    insert_users_one(object: {id: $id, name: $name}, on_conflict: {constraint: users_pkey, update_columns: created_at}) {
      id
    }
  }
`;

export function addNewUser(id, name) {
  return fetchGraphQL(operationsDoc, 'INSERT_NEW_USER', { id: id, name: name });
}

// async function startExecuteINSERT_NEW_USER(id, name) {
//   const { errors, data } = await executeINSERT_NEW_USER(id, name);

//   if (errors) {
//     // handle those errors like a pro
//     console.error(errors);
//   }

//   // do something great with this precious data
//   console.log(data);
// }

// startExecuteINSERT_NEW_USER(id, name);
