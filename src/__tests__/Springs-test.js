/** @license
 *  Copyright 2017 Adam Miskiewicz
 *
 *  Use of this source code is governed by a MIT-style license that can be found
 *  in the LICENSE file or at https://opensource.org/licenses/MIT.
 */
// @flow

import { Spring } from "../";

describe("Spring", () => {
  it("animates correctly with base values", () => {
    const spring = new Spring({
      fromValue: 0,
      toValue: 1
    });

    const { values, velocities } = _measureSpringDynamics(spring, 80);
    expect(values).toMatchSnapshot();
    expect(velocities).toMatchSnapshot();
  });

  it("animates correctly with non-zero initialVelocity", () => {
    const spring = new Spring({
      fromValue: 10,
      toValue: 100,
      stiffness: 230,
      damping: 22,
      mass: 1,
      initialVelocity: 2
    });

    const { values, velocities } = _measureSpringDynamics(spring, 80);

    expect(velocities[0]).toBe(2);
    expect(velocities[values.length - 1]).toBe(0);

    expect(values).toMatchSnapshot();
    expect(velocities).toMatchSnapshot();
  });

  it("animates correctly with non-zero fromValue", () => {
    const spring = new Spring({
      fromValue: 25,
      toValue: 50,
      stiffness: 230,
      damping: 22,
      mass: 1
    });

    const { values, velocities } = _measureSpringDynamics(spring, 60);

    expect(values[0]).toBe(25);
    expect(values[values.length - 1]).toBe(50);

    expect(values).toMatchSnapshot();
    expect(velocities).toMatchSnapshot();
  });

  it("animates correctly with fromValue that's larger than toValue", () => {
    const spring = new Spring({
      fromValue: 200,
      toValue: 11,
      stiffness: 230,
      damping: 22,
      mass: 1
    });

    const { values, velocities } = _measureSpringDynamics(spring, 60);

    expect(values[0]).toBe(200);
    expect(values[values.length - 1]).toBe(11);

    expect(values).toMatchSnapshot();
    expect(velocities).toMatchSnapshot();
  });

  it("keeps proper dynamics when the config is updated during the animation", () => {
    const spring = new Spring({
      fromValue: 25,
      toValue: 131,
      stiffness: 230,
      damping: 22,
      mass: 1
    });

    const {
      values: expectedValues,
      velocities: expectedVelocities
    } = _measureSpringDynamics(spring, 60);

    // Just run spring for 10 frames...we don't care about its
    // values/velocities -- other tests cover this
    _measureSpringDynamics(spring, 10);

    spring.updateConfig({}); // don't change anything

    const {
      values: valuesAfterUpdate,
      velocities: velocitiesAfterUpdate
    } = _measureSpringDynamics(spring, 60);

    // Get the expected values/velocities after 10 frames
    const expectedValuesAfterUpdate = expectedValues.slice(10);
    const expectedVelocitiesAfterUpdate = expectedVelocities.slice(10);

    valuesAfterUpdate.forEach((val, i) => {
      expect(val).toBeCloseTo(expectedValuesAfterUpdate[i], 0.00000001);
    });
    velocitiesAfterUpdate.forEach((vel, i) => {
      expect(vel).toBeCloseTo(expectedVelocitiesAfterUpdate[i], 0.00000001);
    });
  });

  it("respects toValue being updated mid-animation", () => {
    const spring = new Spring({
      fromValue: 25,
      toValue: 131,
      stiffness: 230,
      damping: 22,
      mass: 1
    });

    const {
      values: expectedValues,
      velocities: expectedVelocities
    } = _measureSpringDynamics(spring, 60);

    // Just run spring for 5 frames
    _measureSpringDynamics(spring, 5);

    spring.updateConfig({
      toValue: 200,
      restDisplacementThreshold: 0.01
    }); // Extend the spring

    // Run the simulation till spring rests
    const {
      values: valuesAfterUpdate,
      velocities: velocitiesAfterUpdate
    } = _measureSpringDynamics(spring, 60);

    // Expect spring to be at rest with new values
    expect(valuesAfterUpdate[valuesAfterUpdate.length - 1]).toBe(200);
    expect(velocitiesAfterUpdate[velocitiesAfterUpdate.length - 1]).toBe(0);
  });

  it("respects initialVelocity being updated mid-animation", () => {
    const spring = new Spring({
      fromValue: 25,
      toValue: 131,
      stiffness: 230,
      damping: 22,
      mass: 1
    });

    const {
      values: expectedValues,
      velocities: expectedVelocities
    } = _measureSpringDynamics(spring, 60);

    // Just run spring for 10 frames
    _measureSpringDynamics(spring, 10);

    spring.updateConfig({
      initialVelocity: 200
    });

    // Run the simulation till spring rests
    const {
      values: valuesAfterUpdate,
      velocities: velocitiesAfterUpdate
    } = _measureSpringDynamics(spring, 60);

    // Expect spring to be at rest with new values
    expect(valuesAfterUpdate[0]).toBe(expectedValues[10]); // first frame should be the same position as ending frame
    expect(valuesAfterUpdate[1]).toBeGreaterThan(2000); // should go to a really high number
    expect(velocitiesAfterUpdate[0]).toBe(200);
    expect(velocitiesAfterUpdate[8]).toBeLessThan(0); // given the spring dynamics, v should go negative pretty quickly
  });

  it("removes existing listener", () => {
    const spring = new Spring();
    const onUpdateListener = () => {};
    spring.onUpdate(onUpdateListener);
    expect(spring._listeners[0].onUpdate).toBe(onUpdateListener);
    spring.removeListener(onUpdateListener);
    expect(spring._listeners).toEqual([]);
  });

  it("clears all listeners", () => {
    const spring = new Spring();
    const onUpdateListener = () => {};
    spring.onUpdate(onUpdateListener);
    expect(spring._listeners[0].onUpdate).toBe(onUpdateListener);
    spring.removeAllListeners();
    expect(spring._listeners).toEqual([]);
  });

  it("synchronously notifies listeners that the spring has started when .start() is called", () => {
    const onStartListener = jest.fn();

    const spring = new Spring({
      toValue: 1
    });

    spring.onStart(onStartListener);

    spring.start();
    expect(onStartListener).toHaveBeenCalledWith(spring);
  });

  it("synchronously notifies listeners that the spring has stopped when .stop() is called mid-animation", () => {
    const onStopListener = jest.fn();

    const spring = new Spring({
      toValue: 1
    });

    spring
      .onStop(s => {
        onStopListener(s);
        expect(s.currentVelocity).toBeCloseTo(0.00165009062976268, 0.001);
      })
      .start();

    jest.runTimersToTime(1000 / 60 * 10);

    spring.stop();
    expect(onStopListener).toHaveBeenCalledWith(spring);
    expect(spring.isAtRest).toBeFalsy();

    jest.runTimersToTime(1000 / 60 * 1);

    expect(onStopListener).toHaveBeenCalledTimes(1);
  });

  it("should only call onUpdate once per frame", () => {
    const onUpdateListener = jest.fn();
    const onStopListener = jest.fn();

    const spring = new Spring({ fromValue: 0, toValue: 1 });
    spring.onUpdate(onUpdateListener);
    spring.onStop(onStopListener);

    spring.start();
    spring.updateConfig({ toValue: 0 });
    spring.updateConfig({ fromValue: 1 });

    expect(onUpdateListener).not.toHaveBeenCalled();

    jest.runTimersToTime(1000 / 60);

    expect(onUpdateListener).toHaveBeenCalledTimes(1);
    expect(onStopListener).not.toHaveBeenCalled();
  });

  it("should call onStop on the next frame if fromValue and toValue are updated to match during the animation", () => {
    const onStopListener = jest.fn();

    const spring = new Spring({ fromValue: 0, toValue: 1 });
    spring.onStop(onStopListener);

    spring.start();

    jest.runTimersToTime(1000 / 60);
    spring.updateConfig({ fromValue: 1, initialVelocity: 0 });
    expect(onStopListener).not.toHaveBeenCalled();

    jest.runTimersToTime(1000 / 60);
    expect(onStopListener).toHaveBeenCalled();
  });

  function _measureSpringDynamics(spring: Spring, numFrames: number) {
    const values = [];
    const velocities = [];

    spring
      .onUpdate(spring => {
        values.push(spring.currentValue);
        velocities.push(spring.currentVelocity);
      })
      .start();

    jest.runTimersToTime(1000 / 60 * numFrames + 1); // add an extra ms to fix any rounding errors

    spring.removeAllListeners();

    return { values, velocities };
  }
});
