const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const format = require("date-fns/format");
const isMatch = require("date-fns/isMatch");

const dbPath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let db = null;

const initializingDatabase = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializingDatabase();

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};
const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};
const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};
const hasCategoryAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};
const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};
const hasCategoryAndPriorityProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};
const hasQueryDateProperty = (requestQuery) => {
  return requestQuery.date !== undefined;
};
const hasBodyDateProperty = (requestBody) => {
  return requestBody.dueDate !== undefined;
};

const covertTodoData = (eachTodo) => {
  return {
    id: eachTodo.id,
    todo: eachTodo.todo,
    priority: eachTodo.priority,
    category: eachTodo.category,
    status: eachTodo.status,
    dueDate: eachTodo.due_date,
  };
};

const authentication = (request, response, next) => {
  const statusArr = ["TO DO", "IN PROGRESS", "DONE"];
  const priorityArr = ["HIGH", "MEDIUM", "LOW"];
  const categoryArr = ["WORK", "HOME", "LEARNING"];

  const requestQueryData = request.query;
  const requestBodyData = request.body;

  switch (true) {
    case hasStatusProperty(request.query):
      if (statusArr.includes(requestQueryData.status)) {
        next();
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case hasPriorityProperty(request.query):
      if (priorityArr.includes(requestQueryData.priority)) {
        next();
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case hasCategoryProperty(request.query):
      if (categoryArr.includes(requestQueryData.category)) {
        next();
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case hasQueryDateProperty(request.query):
      if (isMatch(request.query.date, "yyyy-MM-dd")) {
        next();
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
      break;
    case hasStatusProperty(request.body):
      if (statusArr.includes(requestBodyData.status)) {
        next();
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case hasPriorityProperty(request.body):
      if (priorityArr.includes(requestBodyData.priority)) {
        next();
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case hasCategoryProperty(request.body):
      if (categoryArr.includes(requestBodyData.category)) {
        next();
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case hasBodyDateProperty(request.body):
      if (isMatch(request.query.dueDate, "yyyy-MM-dd")) {
        next();
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
      break;
    default:
      next();
  }
};

// Returns a list of all todos whose status is 'TO DO' API
app.get("/todos/", authentication, async (request, response) => {
  let data = null;
  let getTodosQuery = "";
  const { search_q = "", status, priority, category } = request.query;

  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND priority = '${priority}';`;
      break;
    case hasPriorityProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}';`;
      break;
    case hasStatusProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}';`;
      break;
    case hasCategoryAndStatusProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND category = '${category}';`;
      break;
    case hasCategoryProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}';`;
      break;
    case hasCategoryAndPriorityProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}'
        AND priority = '${priority}';`;
      break;
    default:
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%';`;
  }
  data = await db.all(getTodosQuery);
  response.send(data.map((eachTodo) => covertTodoData(eachTodo)));
});

// Returns a specific todo based on the todo ID API
app.get("/todos/:todoId/", authentication, async (request, response) => {
  const { todoId } = request.params;

  const getTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE
      id = ${todoId};`;
  const todo = await db.get(getTodoQuery);
  response.send(covertTodoData(todo));
});

// Returns a list of all todos with a specific due date API
app.get("/agenda/", authentication, async (request, response) => {
  const { date } = request.query;

  const getDueDateTodosQuery = `SELECT * FROM todo WHERE due_date = '${date}';`;

  const dueDateTodos = await db.all(getDueDateTodosQuery);
  response.send(dueDateTodos.map((eachTodo) => covertTodoData(eachTodo)));
});

// create Todo API
app.post("/todos/", authentication, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  const addTodoQuery = `
  INSERT INTO
   todo (id, todo, priority, status, category, due_date)
  VALUES
   (${id}, '${todo}', '${priority}', '${status}', '${category}', '${dueDate}');`;
  await db.run(addTodoQuery);
  response.send("Todo Successfully Added");
});

// Updates the details of a specific todo based on the todo ID API
app.put("/todos/:todoId/", authentication, async (request, response) => {
  const { todoId } = request.params;

  let updateColumn = "";

  const requestBody = request.body;

  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      updateColumn = "Category";
      break;
    case requestBody.dueDate !== undefined:
      updateColumn = "Due Date";
      break;
  }

  const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`;

  const previousTodo = await db.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;

  const updateDistrictQuery = `
    UPDATE
      todo
    SET
      todo='${todo}',
      priority='${priority}',
      status='${status}',
      category='${category}',
      due_date='${dueDate}'
    WHERE
      id = ${todoId};`;

  await db.run(updateDistrictQuery);
  response.send(`${updateColumn} Updated`);
});

// Deletes a todo from the todo table based on the todo ID API
app.delete("/todos/:todoId/", authentication, async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;

  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
