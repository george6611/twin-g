import React from 'react';
import Input from './Input';

export default function TextArea(props) {
  return <Input textarea rows={props.rows || 4} {...props} />;
}
