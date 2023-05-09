import React from 'react';
import { render } from 'expo-enzyme';
import { shallow } from 'enzyme';
import BasicView from '/src/components/basicview/BasicView';

describe('BasicView', () => {
  it('renders without crashing', () => {
    const stream = new MediaStream();
    render(<BasicView stream={stream} />);
  });

  it('renders a video element with the expected style', () => {
    const stream = new MediaStream();
    const wrapper = shallow(<BasicView stream={stream} />);
    const videoElement = wrapper.find({ testID: 'video-element' });
    expect(videoElement.props().style).toEqual({
      height: '300px',
      width: '400px',
      backgroundColor: 'gray',
    });
  });
});
