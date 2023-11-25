import React, { Component } from 'react';
import Client from 'electron-rpc/client';

const endThreshold = 10;

export default class Crosshair extends Component {
  constructor(props) {
    super(props);
    this.state = {
      coordinates: null,
    };

    this.client = new Client();
    this.client.on('coordinates', (error, body) => {
      this.setState({ coordinates: body });
    });
  }

  render() {
    const { coordinates } = this.state;
    if (!coordinates) {
      return <div />;
    }
    return (
      <div className="crosshair-container">
        <div
          className="crosshair"
          style={{
            left: coordinates.mouse.x,
            top: coordinates.mouse.y,
          }}
        >
          <div
            className="right"
            style={{ right: -coordinates.right, width: coordinates.right }}
          >
            {coordinates.right > endThreshold && <div className="end" />}
          </div>
          <div
            className="left"
            style={{ left: -coordinates.left, width: coordinates.left }}
          >
            {coordinates.left > endThreshold && <div className="end" />}
          </div>
          <div
            className="top"
            style={{ top: -coordinates.top, height: coordinates.top }}
          >
            {coordinates.top > endThreshold && <div className="end" />}
          </div>
          <div
            className="bottom"
            style={{ bottom: -coordinates.bottom, height: coordinates.bottom }}
          >
            {coordinates.bottom > endThreshold && <div className="end" />}
          </div>
          <div className="info">
            {coordinates.right + coordinates.left} x{' '}
            {coordinates.top + coordinates.bottom}
          </div>
        </div>
      </div>
    );
  }
}
