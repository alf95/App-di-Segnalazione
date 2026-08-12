import { render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { ReportStatus } from '../../../../packages/@urbanreport/types/src';
import { StatusBadge } from './StatusBadge';

const hasBackgroundColor = (node: ReactTestInstance, color: string): boolean => {
  const styles = Array.isArray(node.props.style) ? node.props.style : [node.props.style];

  if (styles.some((style) => style?.backgroundColor === color)) {
    return true;
  }

  return node.children.some((child) => {
    return typeof child !== 'string' && hasBackgroundColor(child, color);
  });
};

describe('StatusBadge', () => {
  it('renders the status label with spaces instead of underscores', () => {
    const { getByText } = render(<StatusBadge status={ReportStatus.IN_PROGRESS} />);

    expect(getByText('IN PROGRESS')).toBeTruthy();
  });

  it('applies the expected background color for the provided status', () => {
    const { root } = render(<StatusBadge status={ReportStatus.RESOLVED} />);

    expect(hasBackgroundColor(root, '#2e7d32')).toBe(true);
  });
});