import { DeviceFrame } from "./device-frame";

/**
 * Two stacked phone mockups for feature sections that span a pair of tabs.
 * Renders side-by-side with opposing tilts on desktop; stacks vertically on
 * mobile so neither phone gets too cramped.
 */
export function DevicePair({
  first,
  second,
}: {
  first: React.ReactNode;
  second: React.ReactNode;
}) {
  return (
    <div className="relative grid w-full max-w-[28rem] grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-0">
      <DeviceFrame
        glow="subtle"
        className="sm:rotate-[-3deg] sm:translate-y-2"
      >
        {first}
      </DeviceFrame>
      <DeviceFrame
        glow="subtle"
        className="sm:rotate-[3deg] sm:-translate-y-2 sm:-ml-6 sm:z-10"
      >
        {second}
      </DeviceFrame>
    </div>
  );
}
