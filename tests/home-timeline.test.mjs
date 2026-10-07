import test from 'node:test';
import assert from 'node:assert/strict';
import { homePhaseAt, HOME_DURATION } from '../src/home-timeline.js';

test('Home automatically progresses through five demo stages then stays on Home after seven seconds', () => {
  const milestones = [[0,'intro'],[1199,'intro'],[1200,'upload'],[2500,'select'],[4000,'prepare'],[5300,'ready'],[6500,'settled'],[7000,'settled'],[60000,'settled']];
  for (const [time, stage] of milestones) assert.equal(homePhaseAt(time).id,stage);
  assert.equal(HOME_DURATION,7000);
  assert.equal(homePhaseAt(2500).elapsed,0);
  assert.equal(homePhaseAt(3100).elapsed,600);
});
