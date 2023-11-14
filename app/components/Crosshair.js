import React, { Component } from 'react';
import Client from 'electron-rpc/client';

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
        />
      </div>
    );
  }
}
