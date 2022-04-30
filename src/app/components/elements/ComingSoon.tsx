import { FC } from "react";
import classNames from "clsx";
import { getPublicURL } from "lib/ext/utils";

interface ComingSoonProps {
  label: string;
  size?: "large" | "medium" | "small" | "extra-small";
  className?: string;
}
const ComingSoon: FC<ComingSoonProps> = ({
  label,
  size = "large",
  className,
}) => {
  return (
    <div
      className={classNames(
        "w-full",
        "flex flex-col grow items-center justify-center",
        size === "extra-small" && "pb-16",
        (size === "small" || size === "medium") && "pb-20",
        size === "large" && "pb-28",
        className
      )}
    >
      <img
        src={getPublicURL("icons/coming-soon.svg")}
        alt={`${label} section is under development`}
        className={classNames(
          size === "large" && "w-[33.5rem]",
          size === "medium" && "w-[29rem]",
          size === "extra-small" && "w-[18rem]",
          "h-auto"
        )}
      />
      <h2
        className={classNames(
          "font-bold text-brand-light",
          size === "extra-small" && "text-lg mt-4",
          size === "small" && "text-xl mt-6",
          size === "medium" && "text-2xl mt-7",
          size === "large" && "text-3xl mt-10"
        )}
      >
        We are on the way...
      </h2>
      <p
        className={classNames(
          "text-brand-font",
          size === "extra-small" && "text-xs mt-0.5",
          size === "small" && "text-sm mt-0.5",
          size === "medium" && "text-base mt-1",
          size === "large" && "text-lg mt-1.5"
        )}
      >
        {label} section is under development
      </p>
    </div>
  );
};

export default ComingSoon;