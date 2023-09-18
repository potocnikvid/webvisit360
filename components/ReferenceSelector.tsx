import { Fragment, useState } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";

const categories = [
  {
    id: 1,
    name: "Vse",
    href: "#",
    current: true,
  },
  {
    id: 2,
    name: "Trgovine",
    href: "#",
    current: false,
  },
  {
    id: 3,
    name: "Restavracije",
    href: "#",
    current: false,
  },
  {
    id: 4,
    name: "Hoteli",
    href: "#",
    current: false,
  },
  {
    id: 5,
    name: "Zdravstvo",
    href: "#",
    current: false,
  },
  {
    id: 6,
    name: "Industrija",
    href: "#",
    current: false,
  },
  {
    id: 7,
    name: "Šole",
    href: "#",
    current: false,
  },
  {
    id: 8,
    name: "Apartmaji",
    href: "#",
    current: false,
  },
  {
    id: 9,
    name: "Nepremičnine",
    href: "#",
    current: false,
  },
  {
    id: 10,
    name: "Šport",
    href: "#",
    current: false,
  },
  {
    id: 11,
    name: "Kultura",
    href: "#",
    current: false,
  },
  {
    id: 12,
    name: "Avto hiše",
    href: "#",
    current: false,
  },
  {
    id: 13,
    name: "Wellness",
    href: "#",
    current: false,
  },
  {
    id: 14,
    name: "Kampi",
    href: "#",
    current: false,
  },
  {
    id: 15,
    name: "Frizerski saloni",
    href: "#",
    current: false,
  },
  {
    id: 16,
    name: "Optike",
    href: "#",
    current: false,
  },

  {
    id: 17,
    name: "Ostalo",
    href: "#",
    current: false,
  },
];
export default function ReferenceSelector() {
  const [selected, setSelected] = useState(categories[0]);

  return (
    <Listbox value={selected} onChange={setSelected}>
      <div className="relative mt-1 z-10">
        <Listbox.Button className="relative w-64 cursor-default rounded-md bg-white py-2 pl-8 pr-10 text-left ring-1 ring-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 text-sm lg:w-96 lg:px-6 lg:py-4 lg:text-lg">
          <span className="block truncate ">{selected.name}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon
              className="h-5 w-5 text-gray-400 lg:h-6  lg:w-6"
              aria-hidden="true"
            />
          </span>
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute mt-1 max-h-64 w-64 overflow-auto rounded-md bg-white py-1 ring-1 ring-neutral-200 focus:outline-none text-sm lg:text-md lg:max-h-96 lg:w-96 ">
            {categories.map((category, categoryIdx) => (
              <Listbox.Option
                key={categoryIdx}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active ? "bg-amber-100 text-amber-900" : "text-gray-900"
                  }`
                }
                value={category}
              >
                {({ selected }) => (
                  <>
                    <span
                      className={`block truncate ${
                        selected ? "font-medium" : "font-normal"
                      }`}
                    >
                      {category.name}
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}
