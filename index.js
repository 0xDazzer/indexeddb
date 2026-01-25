import { adoptDB, adoptRequest } from './adapters.js';

// Open the database
const openRequest = indexedDB.open('test', 1);
openRequest.addEventListener('upgradeneeded', (event) => {
  // console.log(event);
  const db = event.target.result;
  const store = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
  store.createIndex('name', 'name', { unique: false });
  store.createIndex('age', 'age', { unique: false });
});
const database = await adoptRequest(openRequest);
window.db = adoptDB(database);

// // Add a record to the database
// const tx = db.transaction(['users'], 'readwrite');
// const store = tx.objectStore('users');
// await store.add({ name: 'David', lastName: 'Totrashvili', age: 35, city: 'Tashkent' });
// await store.add({ name: 'Alice', lastName: 'Johnson', age: 28, city: 'New York' });
// await store.add({ name: 'Bob', lastName: 'Smith', age: 42, city: 'Los Angeles' });
// await store.add({ name: 'Eve', lastName: 'Davis', age: 30, city: 'Chicago' });
// await store.add({ name: 'Charlie', lastName: 'Brown', age: 25, city: 'Houston' });
// await store.add({ name: 'Frank', lastName: 'Miller', age: 40, city: 'Phoenix' });
// await store.add({ name: 'Grace', lastName: 'Wilson', age: 27, city: 'Philadelphia' });
// await store.add({ name: 'Hannah', lastName: 'Moore', age: 33, city: 'San Antonio' });
// await store.add({ name: 'Ian', lastName: 'Taylor', age: 29, city: 'San Diego' });
// await store.add({ name: 'Judy', lastName: 'Anderson', age: 31, city: 'Dallas' });
// await store.add({ name: 'Kevin', lastName: 'Thomas', age: 38, city: 'San Jose' });
// await store.add({ name: 'Laura', lastName: 'Jackson', age: 26, city: 'Austin' });
// await store.add({ name: 'Mike', lastName: 'White', age: 34, city: 'Fort Worth' });
// await store.add({ name: 'Nina', lastName: 'Harris', age: 32, city: 'Columbus' });
// await store.add({ name: 'Oscar', lastName: 'Martin', age: 36, city: 'Charlotte' });
// await store.add({ name: 'Pam', lastName: 'Thompson', age: 24, city: 'San Francisco' });

// const tx = db.transaction('users', 'readonly');
// const store = tx.objectStore('users');

// const users = await store.getAll();
// const user = await store.get(1);
// console.log('all users', users);
// console.log('user with id 1', user);

// const index = store.index('name');
// const userByName = await index.get('David');
// console.log('user by name', userByName);

// const index = store.index('age');
// const query = IDBKeyRange.bound(30, 35, true, true);
// const usersByAge = await index.getAll(query);
// console.log('users by age', usersByAge);

// const iterable = store.openCursor();
// for await (const cursor of iterable) {
//   console.log('cursor key', cursor.value);
//   cursor.continue();
// }

