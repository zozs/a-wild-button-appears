# Notes about calculating the next announce time and such stuff

`next_announce` can be found by querying the slack api, and see if any message is scheduled.

## Periodic recalculation of next announce time

Every hour, perform these actions.

* For every instance, check for any of these conditions.
  * If `next_announce` is NULL, then we should calculate a new announce time.
  * If `next_announce` is a time that has passed, then we should also calculate a new announce time.
  * Otherwise, do not do anything and abort.
* Next, we should calculate the next announce time. Requirements for such a time:
  * It should not be on a day that already has had a button.
  * It should _only_ occur on weekdays within the `weekdays` bitmask.
  * It should appear within the range [`interval_start`, `interval_end`[, randomised to the second.
  * It should be a time in the future compared to now.
* Perhaps all the above can be done in a loop, so that we iteratively try the current day, then next day, etc
  until we find something that works. Don't forget to take the correct time zone into consideration.
* After this, schedule it using `chat.scheduleMessage` on the calculated time.


## Upon server reboot

* No action necessary, since we have scheduled the messages using Slack, so a reboot of the server doesn't matter.

## Other random notes

If the announce settings are changed, we should perhaps immediately clear the `next_announce` by invalidating
the currently scheduled message for the team, and the re-run the calculations above. Note that invalidating an
entry probably means both remove it from a scheduled Slack message, and remove any initialized-but-not-clicked
buttons in the database.

If we use the logic above,
this would probably work out quite well, since it would guarantee that a button will appear this day, if it hasn't
already, and if it has already appeared, we should wait until tomorrow. We need to take care of the special case
where there hasn't been a button today, but we're now outside of the interval. It should be fairly easy to detect
this when doing the randomized range though, if the range is empty, we simply wait until tomorrow.
