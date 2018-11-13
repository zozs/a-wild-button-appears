# Database schema

This is the suggested design for a database schema for a-wild-button-appears.

## Instances

```
CREATE TABLE IF NOT EXISTS instances (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  token TEXT NOT NULL,
  signing_secret TEXT NOT NULL,
  channel TEXT NOT NULL
);
```

## Buttons

```
CREATE TABLE IF NOT EXISTS buttons (
  id SERIAL PRIMARY KEY,
  instance INTEGER REFERENCES instances,
  appeared TIMESTAMP NOT NULL,
  CONSTRAINT no_same_time UNIQUE (instance, appeared)
);
```

## Clicks

```
CREATE TABLE IF NOT EXISTS clicks (
  id SERIAL PRIMARY KEY,
  button INTEGER REFERENCES buttons,
  uid TEXT NOT NULL,
  clicked TIMESTAMP NULL,
  CONSTRAINT no_click_twice UNIQUE (button, uid)
);
```

## View of winning clicks

```
CREATE OR REPLACE VIEW winning_clicks AS
  SELECT instance, button, appeared, uid, clicked, (clicked - appeared) AS latency FROM (
    SELECT instance, button, appeared, uid, clicked, row_number() OVER (PARTITION BY button ORDER BY clicked ASC NULLS LAST) AS rn
    FROM clicks INNER JOIN buttons ON buttons.id=clicks.button
  ) winners WHERE rn=1;
```

## Example queries

### Get all (user, clicked) clicks for a button, first one is winner.

`SELECT uid, clicked, (clicked - appeared) AS latency FROM clicks INNER JOIN buttons ON clicks.button = buttons.id AND buttons.id=? ORDER BY clicked;`

### Add a new click

`INSERT INTO clicks (button, uid, clicked) VALUES (?, ?, ?);`

### Get top n fastest times for a certain instance

We must take here since the old json-code actually just gets the fastest *winners*, but the code below considers all clicks.

`SELECT uid, clicked FROM clicks WHERE button IN (SELECT id FROM buttons WHERE instance=?) ORDER BY latency LIMIT ?`

Must add a latency column that actually calculates the latency.

## db.js mapped queries

 * Assumes `uuid` is now a random id instead of the appeared time.
   * This probably requires some changes when it comes to creating and sending out buttons and so on.

### isClicked(uuid)

`SELECT COUNT(*) FROM clicks WHERE button=?`

### setClicked(uuid, user, clickTime)

`INSERT INTO clicks (button, uid, clicked) VALUES (?,?,?)`

### addRunnerUp(uuid, user, clickTime)

`INSERT INTO clicks (button, uid, clicked) VALUES (?,?,?)`

Caller should watch out for constraint violations if there's already a click recorded for that user.

### clicksForUuid(uuid)

 * Option 1: DAL recreates the old structure with separated winner and runnerUps.
 * Option 2: DAL just returns a list of clicks in sorted order and the other code should be modified to handle this.

`SELECT uid, clicked, (clicked - appeared) AS latency FROM clicks INNER JOIN buttons ON buttons.id=clicks.button AND button=? AND clicked IS NOT NULL ORDER BY clicked`

### clicksPerUser

to count wins without the view above.

`SELECT uid, COUNT(*) AS wins FROM (
  SELECT uid, row_number() OVER (PARTITION BY button ORDER BY clicked) AS rn
  FROM clicks WHERE button IN (
    SELECT id FROM buttons WHERE instance=?
)) winners
WHERE rn=1 GROUP BY uid ORDER BY wins DESC`

using the `winning_clicks` view:

`SELECT uid, COUNT(*) AS wins FROM winning_clicks
 WHERE instance=? GROUP BY uid ORDER BY wins DESC`

### recentClickTimes(n)

`SELECT appeared, uid, (clicked - appeared) AS latency FROM (
  SELECT appeared, uid, clicked, row_number() OVER (PARTITION BY button ORDER BY clicked ASC NULLS LAST) AS rn
  FROM clicks INNER JOIN buttons ON buttons.id=clicks.button AND buttons.instance=?
) winners WHERE rn=1 ORDER BY appeared DESC LIMIT ?`

using the `winning_clicks` view:

`SELECT appeared, uid, latency FROM winning_clicks
 WHERE instance=? ORDER BY appeared DESC LIMIT ?;`

### fastestClickTimes(n)

`SELECT latency, uid FROM winning_clicks
 WHERE instance=? ORDER BY latency LIMIT ?`

### slowestClickTimes(n)

`SELECT latency, uid FROM winning_clicks
 WHERE instance=? ORDER BY latency DESC NULLS LAST LIMIT ?;`
