/**
 * MUI icon wrappers that match the lucide-react API (size, color, strokeWidth props).
 * This allows drop-in replacement without changing component usage patterns.
 */
import TimelineIcon from "@mui/icons-material/Timeline";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import SearchIcon from "@mui/icons-material/Search";
import ShieldIcon from "@mui/icons-material/Shield";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import DeleteIcon from "@mui/icons-material/Delete";
import BoltIcon from "@mui/icons-material/Bolt";
import BarChartIcon from "@mui/icons-material/BarChart";
import CancelIcon from "@mui/icons-material/Cancel";
import FilterListIcon from "@mui/icons-material/FilterList";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DescriptionIcon from "@mui/icons-material/Description";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import WarningIcon from "@mui/icons-material/Warning";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SettingsIcon from "@mui/icons-material/Settings";
import StorageIcon from "@mui/icons-material/Storage";
import RefreshIcon from "@mui/icons-material/Refresh";

/**
 * Wraps a MUI icon component so it accepts lucide-react-style props:
 *   size (number)  → sx.fontSize
 *   color (string) → htmlColor
 *   strokeWidth    → ignored (MUI icons are filled, not stroked)
 *   style          → merged into sx
 */
function wrap(MuiIcon) {
  return function WrappedIcon({ size, color, strokeWidth, style, ...rest }) {
    return (
      <MuiIcon
        htmlColor={color}
        sx={{ fontSize: size, ...style }}
        {...rest}
      />
    );
  };
}

// Re-export with lucide-react-compatible names
export const Activity = wrap(TimelineIcon);
export const Radio = wrap(RadioButtonCheckedIcon);
export const Search = wrap(SearchIcon);
export const Shield = wrap(ShieldIcon);
export const Play = wrap(PlayArrowIcon);
export const Square = wrap(StopIcon);
export const Trash2 = wrap(DeleteIcon);
export const Zap = wrap(BoltIcon);
export const BarChart3 = wrap(BarChartIcon);
export const XCircle = wrap(CancelIcon);
export const Filter = wrap(FilterListIcon);
export const Eye = wrap(VisibilityIcon);
export const FileText = wrap(DescriptionIcon);
export const Clock = wrap(AccessTimeIcon);
export const AlertTriangle = wrap(WarningIcon);
export const CheckCircle = wrap(CheckCircleIcon);
export const Settings = wrap(SettingsIcon);
export const Database = wrap(StorageIcon);
export const RefreshCw = wrap(RefreshIcon);
