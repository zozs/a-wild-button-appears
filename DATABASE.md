# Database schema

This is the suggested design for a database schema for a-wild-button-appears.

## Instances

```
CREATE TABLE instances (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  token TEXT NOT NULL,
  signing_secret TEXT NOT NULL,
  channel TEXT NOT NULL
);
```

## Buttons

```
CREATE TABLE buttons (
  id SERIAL PRIMARY KEY,
  instance INTEGER REFERENCES instances,
  appeared TIMESTAMP NOT NULL,
  CONSTRAINT no_same_time UNIQUE (instance, appeared)
);
```

## Clicks

```
CREATE TABLE clicks (
  id SERIAL PRIMARY KEY,
  button INTEGER REFERENCES buttons,
  user TEXT NOT NULL,
  clicked TIMESTAMP NOT NULL,
  CONSTRAINT no_click_twice UNIQUE (button, user)
);
```

## Example queries

### Get all (user, clicked) clicks for a button, first one is winner.

`SELECT user, clicked, (clicked - appeared) AS latency FROM clicks INNER JOIN buttons ON buttons.id=? ORDER BY clicked;`

### Add a new click

`INSERT INTO clicks (button, user, clicked) VALUES (?, ?, ?);`

### Get top n fastest times for a certain instance

`SELECT user, clicked FROM clicks WHERE button IN (SELECT id FROM buttons WHERE instance=?) ORDER BY latency LIMIT ?`

Must add a latency column that actually calculates the latency.
