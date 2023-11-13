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
      this.coordinates = body;
    });
  }

  render() {
    if (!this.coordinates) {
      return <div />;
    }
    return <div></div>;
  }
}
