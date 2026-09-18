import { render } from '@testing-library/react-native';
import { ReportStatus } from '../../../../packages/@urbanreport/types/src';
import { StatusBadge } from './StatusBadge';

type StyleProp = { backgroundColor?: string } | null | undefined;

interface TestNode {
  props: { style?: StyleProp | StyleProp[] };
  children: Array<TestNode | string>;
}

const hasBackgroundColor = (node: TestNode, color: string): boolean => {
  const styleProp = node.props.style;
  const styles: StyleProp[] = Array.isArray(styleProp) ? styleProp : [styleProp];

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
