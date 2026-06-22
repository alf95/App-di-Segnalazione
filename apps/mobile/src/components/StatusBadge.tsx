import { Chip } from 'react-native-paper';
import { ReportStatus } from '@urbanreport/types';

interface StatusBadgeProps {
  status: ReportStatus;
}

const STATUS_COLORS: Record<ReportStatus, string> = {
  [ReportStatus.DRAFT]: '#757575',
  [ReportStatus.SUBMITTED]: '#1976d2',
  [ReportStatus.UNDER_REVIEW]: '#7b1fa2',
  [ReportStatus.ASSIGNED]: '#00838f',
  [ReportStatus.IN_PROGRESS]: '#f9a825',
  [ReportStatus.RESOLVED]: '#2e7d32',
  [ReportStatus.REJECTED]: '#d32f2f',
  [ReportStatus.DUPLICATE]: '#616161',
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  return (
    <Chip compact style={{ backgroundColor: STATUS_COLORS[status] }} textStyle={{ color: '#ffffff' }}>
      {status.replace(/_/g, ' ')}
    </Chip>
  );
};
