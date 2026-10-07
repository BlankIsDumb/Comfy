// Comfy theme runtime. Loaded locally by Spicetify.
(async function comfy() {
	// Block Until Mass Usage Deps Loaded
	if (!(globalThis.Spicetify?.React && Spicetify.ReactDOM?.render && Spicetify.Config && Spicetify.Platform?.History)) {
		setTimeout(comfy, 100);
		return;
	}
	console.debug("[Comfy-Event]: Global Dependencies loaded");

	// Add Global Functions
	window.Comfy = {
		Reset: () => {
			localStorage.removeItem("comfy:config");
			location.reload();
		},
		Config: () => {
			console.log(JSON.parse(localStorage.getItem("comfy:config") || "{}"));
		}
	};
	console.debug(`[Comfy-Event]: Global Functions Added`);

	// Initialize Config
	let config;
	try {
		config = JSON.parse(localStorage.getItem("comfy:config") || "{}");
		if (!config || typeof config !== "object" || Array.isArray(config)) config = {};
	} catch {
		console.warn("[Comfy-Warning]: Invalid saved settings; using defaults");
		config = {};
	}
	if ("Color-Scheme" in config || "Color-Schemes" in config) {
		delete config["Color-Scheme"];
		delete config["Color-Schemes"];
		localStorage.setItem("comfy:config", JSON.stringify(config));
	}
	let startup = true;
	let preloadContainer = document.createElement("div");
	console.debug(`[Comfy-Event]: Config Initialized`);

	// Window Zoom Variable
	function updateZoomVariable() {
		const update = () => {
			const modified = window.outerWidth / window.innerWidth || 1;
			document.documentElement.style.setProperty("--zoom", modified);
			console.debug(`[Comfy-Event]: Zoom Updated: ${window.outerWidth} / ${window.innerWidth} = ${modified}`);
		}

		update();
		window.addEventListener("resize", update, { passive: true });
	}

	updateZoomVariable();

	// Layout Variables
	function updateLayoutVariables() {
		const root = document.documentElement;
		const rootStyle = getComputedStyle(root);
		const readWidth = (variable, selector) => {
			const configured = Number.parseFloat(rootStyle.getPropertyValue(variable));
			if (Number.isFinite(configured)) return configured;
			return document.querySelector(selector)?.getBoundingClientRect().width || 0;
		};

		root.style.setProperty("--comfy-panel-width", `${readWidth("--panel-width", ".Root__right-sidebar")}px`);
		root.style.setProperty("--comfy-left-sidebar-width", `${readWidth("--left-sidebar-width", "#Desktop_LeftSidebar_Id")}px`);
	}

	waitForDeps(
		".Root__top-container",
		container => {
			const resizeObserver = new ResizeObserver(updateLayoutVariables);
			const observeLayout = () => {
				resizeObserver.observe(container);
				const sidebar = document.getElementById("Desktop_LeftSidebar_Id");
				const panel = document.querySelector(".Root__right-sidebar");
				if (sidebar) resizeObserver.observe(sidebar);
				if (panel) resizeObserver.observe(panel);
				updateLayoutVariables();
			};

			observeLayout();
		},
		true
	);

	waitForDeps("Spicetify.Platform.version", version => {
		if (version >= "1.2.46.462") {
			waitForDeps(
				":root .global-nav",
				root => {
					if (!root.classList.contains("global-nav-centered")) {
						root.classList.add("global-nav-centered");
					}
				},
				true
			);
		}
	});

	// Banner Image(s)
	let channels = {
		Lyrics: { regex: /^\/lyrics$/, enabled: getConfig("Lyrics") ?? false },
		Playlist: { regex: /^\/playlist\//, enabled: getConfig("Playlist") ?? true },
		Station: { regex: /^\/station\/playlist\//, enabled: getConfig("Station") ?? true },
		Artist: { regex: /^\/artist\/(?!artists\b)\w+$/, enabled: getConfig("Artist") ?? true },
		Album: { regex: /^\/album\//, enabled: getConfig("Album") ?? true },
		Collection: { regex: /^\/collection\/tracks$/, enabled: getConfig("Collection") ?? true },
		"Your-Episodes": { regex: /^\/collection\/your-episodes$/, enabled: getConfig("Your-Episodes") ?? true },
		"Local-Files": { regex: /^\/collection\/local-files$/, enabled: getConfig("Local-Files") ?? true },
		Show: { regex: /^\/show\//, enabled: getConfig("Show") ?? true },
		Episode: { regex: /^\/episode\//, enabled: getConfig("Episode") ?? true },
		"Lyrics-Plus": { regex: /^\/lyrics-plus$/, enabled: getConfig("Lyrics-Plus") ?? true },
		User: { regex: /^\/user\/(?!users\b)\w+$/, enabled: getConfig("User") ?? true },
		Genre: { regex: /^\/genre\//, enabled: getConfig("Genre") ?? true }
	};

	const frame = document.createElement("div");
	const banner = [document.createElement("div"), document.createElement("div")];

	frame.className = "comfy-banner-frame";
	banner.forEach(image => {
		image.className = "comfy-banner-image";
		frame.append(image);
	});

	let bannerRevision = 0;
	let bannerWatchRevision = 0;
	let bannerObserver;
	let bannerWatchTimeout;
	let bannerSyncFrame;
	let lastHeaderImage;
	let lastHeaderBackground;
	const bannerDomSelector = ".before-scroll-node, .main-entityHeader-background, .main-entityHeader-image";

	function isBannerEnabled() {
		return getConfig("Banner-Enabled") ?? true;
	}

	function isAppleMusicGradientEnabled() {
		return Boolean(getConfig("Apple-Music-Gradient-Snippet"));
	}

	function isBannerChannel(pathname = Spicetify.Platform.History?.location?.pathname) {
		return Boolean(pathname && Object.values(channels).some(channel => channel.enabled && channel.regex.test(pathname)));
	}

	function needsBannerSource() {
		return isBannerEnabled() && isBannerChannel();
	}

	function needsHeaderArtwork() {
		if (!needsBannerSource()) return false;
		const pathname = Spicetify.Platform.History.location.pathname;
		const prefersAlbumArtwork = Boolean(getConfig("Prefer-Existing-Image")) && /^\/album\//.test(pathname);
		const includesNativeGradient = isAppleMusicGradientEnabled() &&
			Boolean(getConfig("AM-Gradient-Include-Existing-Snippet")) &&
			/^\/(?:artist|playlist)\//.test(pathname);
		return prefersAlbumArtwork || includesNativeGradient;
	}

	function readHeaderImages() {
		const main = document.querySelector(".Root__main-view");
		const container = main?.querySelector(".before-scroll-node");
		// Spotify also assigns this class to the wrapper; select the image itself.
		const image = main?.querySelector("img.main-entityHeader-image, .main-entityHeader-image img");
		// New artist pages put their native background directly in the scroll slot.
		// Inspect its few direct children instead of every styled descendant.
		const backgroundCandidates = [main?.querySelector(".main-entityHeader-background")];
		Array.from(container?.children || []).forEach(element => {
			if (element !== frame) backgroundCandidates.push(element);
		});
		backgroundCandidates.push(container?.querySelector(":scope > :not(.comfy-banner-frame) [style*='background']"));

		let background;
		for (const element of backgroundCandidates.filter(Boolean)) {
			const value = element.style?.backgroundImage || getComputedStyle(element).backgroundImage;
			background = value?.match(/url\(["']?(.*?)["']?\)/)?.[1];
			if (background) break;
		}
		return { image: image?.currentSrc || image?.src, background };
	}

	function mountBanner() {
		if (!isBannerEnabled()) {
			frame.remove();
			return;
		}
		const container = document.querySelector(".Root__main-view .before-scroll-node");
		if (container && frame.parentElement !== container) container.appendChild(frame);
	}

	function stopBannerWatch() {
		bannerObserver?.disconnect();
		bannerObserver = undefined;
		if (bannerWatchTimeout) clearTimeout(bannerWatchTimeout);
		bannerWatchTimeout = undefined;
		if (bannerSyncFrame) cancelAnimationFrame(bannerSyncFrame);
		bannerSyncFrame = undefined;
	}

	function syncBannerDom(revision) {
		if (revision !== bannerWatchRevision || !needsBannerSource()) return;
		mountBanner();
		if (!needsHeaderArtwork()) return;
		const header = readHeaderImages();
		if (header.image !== lastHeaderImage || header.background !== lastHeaderBackground) {
			lastHeaderImage = header.image;
			lastHeaderBackground = header.background;
			updateBanner();
		}
	}

	function scheduleBannerDomSync(revision) {
		if (revision !== bannerWatchRevision || bannerSyncFrame) return;
		bannerSyncFrame = requestAnimationFrame(() => {
			bannerSyncFrame = undefined;
			syncBannerDom(revision);
		});
	}

	function mutationContainsBannerNode(node) {
		return node.nodeType === Node.ELEMENT_NODE &&
			!node.closest?.(".comfy-banner-frame") &&
			(node.matches(bannerDomSelector) || node.querySelector?.(bannerDomSelector));
	}

	function mutationAffectsBanner(record) {
		if (record.type === "childList") {
			return Array.from(record.addedNodes).some(mutationContainsBannerNode) ||
				Array.from(record.removedNodes).some(mutationContainsBannerNode);
		}
		if (!needsHeaderArtwork() || record.target.closest?.(".comfy-banner-frame")) return false;
		if (record.attributeName === "src" || record.attributeName === "srcset") {
			return record.target.matches("img.main-entityHeader-image, .main-entityHeader-image img");
		}
		return record.attributeName === "style" && Boolean(
			record.target.closest(".main-entityHeader-background") ||
			(record.target.closest(".before-scroll-node") &&
				(record.target.parentElement?.matches(".before-scroll-node") || record.target.getAttribute("style")?.includes("background")))
		);
	}

	async function startBannerWatch(revision) {
		await waitForDeps(".Root__top-container", root => {
			if (revision !== bannerWatchRevision || !needsBannerSource()) return;
			bannerObserver = new MutationObserver(function comfyBannerObserver(records) {
				if (records.some(mutationAffectsBanner)) scheduleBannerDomSync(revision);
			});
			const options = { childList: true, subtree: true };
			if (needsHeaderArtwork()) {
				options.attributes = true;
				options.attributeFilter = ["src", "srcset", "style"];
			}
			bannerObserver.observe(root, options);
			syncBannerDom(revision);
			bannerWatchTimeout = setTimeout(() => {
				if (revision === bannerWatchRevision) stopBannerWatch();
			}, 5000);
		}, true);
	}

	function syncBannerRuntime() {
		const revision = ++bannerWatchRevision;
		stopBannerWatch();
		lastHeaderImage = undefined;
		lastHeaderBackground = undefined;
		if (!needsBannerSource()) {
			++bannerRevision;
			frame.remove();
			frame.style.display = "none";
			document.getElementById("main")?.classList.remove("Banner-Enabled");
			document.documentElement.style.setProperty("--image-url", "none");
			return;
		}
		updateBanner();
		startBannerWatch(revision);
	}

	waitForDeps("Spicetify.Platform.History", history => history.listen(syncBannerRuntime));
	waitForDeps("Spicetify.Player", player => player.addEventListener("songchange", () => {
		if (needsBannerSource()) updateBanner();
	}));
	syncBannerRuntime();

	// Own this feature independently of page banners: browsing another album must
	// never change the artwork used by the Now Playing panel.
	const nowPlayingArtwork = createNowPlayingArtwork();

	// React components
	const Dialog = Spicetify.React.memo(props => {
		const [state, setState] = Spicetify.React.useState(true);
		const self = document.querySelector(".ReactModalPortal:last-of-type");
		const ConfirmDialog = Spicetify.ReactComponent.ConfirmDialog;

		const commonProps = {
			...props,
			isOpen: state,
			onClose: () => {
				setState(false);
				props.onClose?.();
				self?.remove();
			},
			onConfirm: () => {
				setState(false);
				props.onConfirm?.();
				self?.remove();
			}
		};

		Spicetify.React.useEffect(() => {
			if (state) {
				props.onOpen?.();
			}
		}, [state]);

		return Spicetify.React.createElement(ConfirmDialog, commonProps);
	});

	const Section = ({ name, children, condition = true, filter }) => {
		filter = !filter || name === filter.label || filter.index === 0;

		if (condition === false) return null;

		return (
			filter &&
			Spicetify.React.createElement(
				Spicetify.React.Fragment,
				null,
				Spicetify.React.createElement(
					"div",
					{ className: "setting-section", id: name },
					Spicetify.React.createElement("h2", { className: "setting-header" }, name),
					children.map(child =>
						Spicetify.React.createElement(child.type, {
							...child,
							key: child.name,
							tippy: Spicetify.React.createElement(Tippy, { label: child.tippy })
						})
					)
				)
			)
		);
	};

	const Row = ({ name, items }) => {
		return Spicetify.React.createElement(
			Spicetify.React.Fragment,
			null,
			Spicetify.React.createElement(
				"div",
				{ className: name },
				items.map(item =>
					Spicetify.React.createElement(item.type, {
						...item,
						key: item.name,
						tippy: Spicetify.React.createElement(Tippy, { label: item.tippy })
					})
				)
			)
		);
	};

	const Button = ({ name, title, condition = true, callback }) => {
		const [state, setState] = Spicetify.React.useState(title);

		if (condition === false) return;

		return Spicetify.React.createElement(
			"button",
			{
				className: "main-buttons-button",
				id: name,
				onClick: () => {
					callback(state, setState);
				}
			},
			state
		);
	};

	const CardLayout = Spicetify.React.memo(({ title, desc, tippy, action, onClick }) => {
		return Spicetify.React.createElement(
			"div",
			{ className: "setting-card" },
			Spicetify.React.createElement(
				"div",
				{ className: "setting-container", onClick: onClick },
				Spicetify.React.createElement(
					"div",
					{ className: "setting-item" },
					Spicetify.React.createElement("label", { className: "setting-title" }, title, tippy),
					Spicetify.React.createElement("div", { className: "setting-action" }, action)
				),
				Spicetify.React.createElement("div", { className: "setting-description" }, desc),
				desc && Spicetify.React.createElement("div", { className: "setting-description-spacer" })
			)
		);
	});

	const SubSection = Spicetify.React.memo(({ name, condition = true, items, collapseItems: initialCollapseItems = false, callback, ...props }) => {
		const [state, setState] = Spicetify.React.useState(getConfig(name) ?? true);
		const [collapseItems, setCollapseItems] = Spicetify.React.useState(getConfig(`${name}-Collapsed`) ?? initialCollapseItems);

		if (condition === false) return null;

		return Spicetify.React.createElement(
			Spicetify.React.Fragment,
			null,
			Spicetify.React.createElement(
				"div",
				{ className: "setting-subSection", id: state ? (collapseItems ? "collapsed" : "enabled") : "disabled" },
				Spicetify.React.createElement(Toggle, {
					name,
					callback: value => {
						callback?.(value);
						setState(value);

						items.forEach(item => {
							const both = () => (item.type === Input ? "" : item.defaultVal);
							const state = getConfig(item.name) ?? both();

							setConfig(item.name, state);
							if (item.type === Toggle) {
								if (state || !value)
									waitForDeps(
										"main",
										main => {
											console.debug(`[Comfy-subCallback]: ${item.name} =`, state);
											main.classList.toggle(item.name, value ? state : false);
											item.callback?.(state);
										},
										true,
										"getElementById"
									);
							} else if (value && state !== both()) {
								console.debug(`[Comfy-subCallback]: ${item.name}`, state);
								item.callback?.(state, item.name);
							}
						});
					},
					onClick: () => {
						if (state) {
							setConfig(`${name}-Collapsed`, !collapseItems, null, true);
							setCollapseItems(!collapseItems);
						}
					},
					...props
				}),
				state &&
					!collapseItems &&
					!startup &&
					items.map(item =>
						Spicetify.React.createElement(item.type, {
							...item,
						key: item.name,
							tippy: Spicetify.React.createElement(Tippy, { label: item.tippy })
						})
					)
			)
		);
	});

	const Tippy = ({ label }) => {
		if (!label) return null;
		return Spicetify.React.createElement(
			Spicetify.ReactComponent.TooltipWrapper,
			{
				label,
				showDelay: 0,
				placement: "left",
				trigger: "mouseenter"
			},
			Spicetify.React.createElement(
				"div",
				{ className: "x-settings-tooltip" },
				Spicetify.React.createElement(
					"div",
					{
						className: "x-settings-tooltipIconWrapper"
					},
					Spicetify.React.createElement(
						"svg",
						{
							role: "img",
							height: "16",
							width: "16",
							tabIndex: "0",
							className: "Svg-sc-ytk21e-0 Svg-img-icon x-settings-tooltipIcon",
							viewBox: "0 0 16 16"
						},
						Spicetify.React.createElement("path", {
							d: "M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"
						}),
						Spicetify.React.createElement("path", {
							d: "M7.25 12.026v-1.5h1.5v1.5h-1.5zm.884-7.096A1.125 1.125 0 0 0 7.06 6.39l-1.431.448a2.625 2.625 0 1 1 5.13-.784c0 .54-.156 1.015-.503 1.488-.3.408-.7.652-.973.818l-.112.068c-.185.116-.26.203-.302.283-.046.087-.097.245-.097.57h-1.5c0-.47.072-.898.274-1.277.206-.385.507-.645.827-.846l.147-.092c.285-.177.413-.257.526-.41.169-.23.213-.397.213-.602 0-.622-.503-1.125-1.125-1.125z"
						})
					)
				)
			)
		);
	};

	const Toggle = Spicetify.React.memo(({ name, title, desc, tippy, defaultVal, condition = true, callback, onClick }) => {
		const [state, setState] = Spicetify.React.useState(getConfig(name) ?? defaultVal);
		const isFirstRender = Spicetify.React.useRef(true);

		Spicetify.React.useEffect(() => {
			if (isFirstRender.current) {
				isFirstRender.current = false;
				if (!startup) return;
			}

			setConfig(name, state);
			if (state || !startup) {
				waitForDeps(
					"main",
					main => {
						console.debug(`[Comfy-Callback]: ${name} =`, state);
						main.classList.toggle(name, state);
						callback?.(state);
					},
					true,
					"getElementById"
				);
			}
		}, [state]);

		if (condition === false) return null;

		return Spicetify.React.createElement(CardLayout, {
			title,
			desc,
			tippy,
			action: Spicetify.React.createElement(
				"label",
				{ className: "x-toggle-wrapper" },
				Spicetify.React.createElement("input", {
					className: "x-toggle-input",
					type: "checkbox",
					defaultChecked: state,
					onClick: () => setState(!state)
				}),
				Spicetify.React.createElement(
					"span",
					{ className: "x-toggle-indicatorWrapper" },
					Spicetify.React.createElement("span", { className: "x-toggle-indicator" })
				)
			),
			onClick
		});
	});

	const Input = Spicetify.React.memo(
		({ inputType, includePicker, name, title, desc, min, max, step, tippy, defaultVal, condition = true, callback, callbackOverride }) => {
			const [value, setValue] = Spicetify.React.useState(getConfig(name) ?? "");
			const [defaultState, setDefaultState] = Spicetify.React.useState(isPromise(defaultVal) ? "" : defaultVal);
			const isFirstRender = Spicetify.React.useRef(true);
			const textFieldRef = Spicetify.React.useRef(null);

			Spicetify.React.useEffect(() => {
				if (textFieldRef.current) {
					textFieldRef.current.addEventListener("wheel", e => {
						if (document.focusedElement === textFieldRef.current) {
							e.preventDefault();
						}
					});
				}
			}, []);

			Spicetify.React.useEffect(() => {
				let active = true;
				if (isPromise(defaultVal)) {
					Promise.resolve(defaultVal).then(val => {
						if (active) setDefaultState(val ?? "");
					}).catch(error => console.warn("[Comfy-Warning]: Setting placeholder unavailable", name, error));
				}
				return () => { active = false; };
			}, [defaultVal]);

			Spicetify.React.useEffect(() => {
				if (isFirstRender.current) {
					isFirstRender.current = false;
					if (!startup) return;
				}

				setConfig(name, value);
				if (value !== "" || !startup || callbackOverride) {
					console.debug(`[Comfy-Callback]: ${name} =`, value);
					callback?.(value, name, defaultVal);
				}
			}, [value, name]);

			if (condition === false) return null;

			return Spicetify.React.createElement(CardLayout, {
				title,
				desc,
				tippy,
				action: [
					Spicetify.React.createElement("input", {
						type: inputType,
						className: "input",
						ref: textFieldRef,
						value,
						min: inputType === "number" ? Number(min) : null,
						max: inputType === "number" ? Number(max) : null,
						step: inputType === "number" ? Number(step) : null,
						placeholder: defaultState,
						onChange: e => setValue(e.target.value)
					}),
					includePicker &&
						Spicetify.React.createElement("input", {
							type: "color",
							className: "input",
							value,
							placeholder: defaultState,
							onChange: e => setValue(e.target.value)
						})
				]
			});
		}
	);

	const Dropdown = Spicetify.React.memo(({ name, title, desc, options, defaultVal, condition = true, tippy, callback }) => {
		if (!condition) return null;
		if (!defaultVal) defaultVal = "Select an option";
		if (typeof options === "function") options = options();

		const [selectedValue, setSelectedValue] = Spicetify.React.useState(getConfig(name) ?? defaultVal);
		const [buttonEnabled, setButtonEnabled] = Spicetify.React.useState(selectedValue !== defaultVal);
		const [menuOpen, setMenuOpen] = Spicetify.React.useState(false);
		const isFirstRender = Spicetify.React.useRef(true);

		Spicetify.React.useEffect(() => {
			if (isFirstRender.current) {
				isFirstRender.current = false;
				if (!startup) {
					const parent = document.querySelector("generic-modal [aria-label='Comfy Settings']");
					const current = document.getElementById(name);
					parent.addEventListener("click", event => {
						if (event.target.closest(".dropdown-wrapper") !== current) {
							setMenuOpen(false);
						}
					});
					return;
				}
			}

			setConfig(name, selectedValue);
			if ((condition && selectedValue !== defaultVal) || !startup) {
				console.debug(`[Comfy-Callback]: ${name} =`, selectedValue);
				callback?.(name, selectedValue, options, defaultVal);
				setButtonEnabled(selectedValue !== defaultVal);
			}
		}, [selectedValue]);

		return Spicetify.React.createElement(CardLayout, {
			title,
			desc,
			tippy,
			action: [
				buttonEnabled &&
					Spicetify.React.createElement(
						"button",
						{
							className: `switch`,
							onClick: event => {
								event.stopPropagation(); // Prevent event from propagating up
								setSelectedValue(defaultVal);
							}
						},
						Spicetify.React.createElement("svg", {
							height: "16",
							width: "16",
							viewBox: "0 0 16 16",
							fill: "currentColor",
							dangerouslySetInnerHTML: {
								__html: Spicetify.SVGIcons.x
							}
						})
					),
				Spicetify.React.createElement(
					"div",
					{ className: `dropdown-wrapper main-type-mestoBold ${menuOpen ? "menu-open" : ""}`, id: name },
					Spicetify.React.createElement(
						"div",
						{ className: "dropdown-button", onClick: () => setMenuOpen(!menuOpen) },
						Spicetify.React.createElement("div", { className: "dropdown-selection" }, selectedValue),
						Spicetify.React.createElement(
							"div",
							{ className: "dropdown-arrow-wrapper" },
							Spicetify.React.createElement("span", { className: "dropdown-arrow" })
						)
					),
					menuOpen &&
						Spicetify.React.createElement(
							"div",
							{ className: "dropdown-menu" },
							options.map(option =>
								Spicetify.React.createElement(
									"div",
									{
										key: option,
										className: `dropdown-option${selectedValue === option ? " selected" : ""}`,
										role: "option",
										"aria-selected": selectedValue === option,
										onClick: event => {
											event.stopPropagation(); // Prevent event from propagating up
											setSelectedValue(option);
											setMenuOpen(false);
										}
									},
									option
								)
							)
						)
				)
			]
		});
	});

	const Carousel = ({ chips, checked, setChecked }) => {
		const containerRef = Spicetify.React.useRef(null);
		const [showLeftButton, setShowLeftButton] = Spicetify.React.useState(false);
		const [showRightButton, setShowRightButton] = Spicetify.React.useState(false);
		const [startX, setStartX] = Spicetify.React.useState(0);
		const [scrollLeft, setScrollLeft] = Spicetify.React.useState(0);
		const [mouseDown, setMouseDown] = Spicetify.React.useState(false);
		const isFirstRender = Spicetify.React.useRef(true);

		const section = document.querySelector(".main-trackCreditsModal-mainSection");

		// Handle resizing and scroll visibility
		const handleResize = Spicetify.React.useCallback(() => {
			if (containerRef.current) {
				const container = containerRef.current;
				setShowLeftButton(container.scrollLeft > 0);
				setShowRightButton(container.scrollLeft < container.scrollWidth - container.clientWidth - 2);
			}
		}, []);

		Spicetify.React.useEffect(() => {
			handleResize(); // Initial call
			window.addEventListener("resize", handleResize);
			return () => window.removeEventListener("resize", handleResize);
		}, [handleResize]);

		// Scroll to active item on first render
		Spicetify.React.useEffect(() => {
			if (containerRef.current && isFirstRender.current) {
				const activeItem = containerRef.current.querySelector(`.search-searchCategory-categoryGridItem:nth-child(${checked.index + 1})`);
				if (activeItem) {
					const container = containerRef.current;
					const containerScrollLeft = container.scrollLeft;
					const containerWidth = container.clientWidth;
					const itemOffsetLeft = activeItem.offsetLeft;
					const itemWidth = activeItem.clientWidth;

					if (itemOffsetLeft < containerScrollLeft + 32 || itemOffsetLeft + itemWidth > containerScrollLeft + containerWidth - 32) {
						const scrollPosition = itemOffsetLeft - (containerWidth / 2 - itemWidth / 2);
						container.scrollTo({ left: scrollPosition, behavior: "instant" });
					}

					isFirstRender.current = false;
				}
			}
		}, [checked.index]);

		// Handle dragging
		const handleMouseDown = event => {
			setStartX(event.pageX - containerRef.current.offsetLeft);
			setScrollLeft(containerRef.current.scrollLeft);
			setMouseDown(true);
			containerRef.current.style.cursor = "grabbing";
			containerRef.current.style.userSelect = "none";
			containerRef.current.style.scrollBehavior = "auto";
		};

		const handleMouseMove = event => {
			if (!mouseDown) return;
			event.preventDefault();
			const x = event.pageX - containerRef.current.offsetLeft;
			const walk = (x - startX) * 1; // Adjust scrolling speed
			containerRef.current.scrollLeft = scrollLeft - walk;
		};

		const handleMouseUpOrLeave = () => {
			if (mouseDown) {
				containerRef.current.style.cursor = "";
				containerRef.current.style.userSelect = "";
				containerRef.current.style.scrollBehavior = "";
				setMouseDown(false);
			}
		};

		Spicetify.React.useEffect(() => {
			document.addEventListener("mouseup", handleMouseUpOrLeave);
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseleave", handleMouseUpOrLeave);

			return () => {
				document.removeEventListener("mouseup", handleMouseUpOrLeave);
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseleave", handleMouseUpOrLeave);
			};
		}, [mouseDown]);

		// Handle arrow key navigation
		const handleKeyDown = Spicetify.React.useCallback(
			event => {
				let newIndex;
				let startingIndex = checked.index;

				if (document.activeElement.classList.contains("search-searchCategory-categoryGridItem")) {
					startingIndex = Array.from(containerRef.current.querySelectorAll(".search-searchCategory-categoryGridItem")).indexOf(
						document.activeElement
					);
				}

				if (event.key === "ArrowLeft") {
					event.preventDefault();
					newIndex = startingIndex - 1;
					if (newIndex < 0) newIndex = chips.length - 1;
				} else if (event.key === "ArrowRight") {
					event.preventDefault();
					newIndex = (startingIndex + 1) % chips.length;
				} else if (event.key === "Enter") {
					const focusedChip = document.activeElement;
					const index = Array.from(containerRef.current.querySelectorAll(".search-searchCategory-categoryGridItem")).indexOf(focusedChip);
					if (index !== -1) {
						setChecked({ index, label: chips[index].label });
						return;
					}
				}

				if (newIndex !== undefined) {
					const chipElement = containerRef.current.querySelector(`.search-searchCategory-categoryGridItem:nth-child(${newIndex + 1})`);
					if (chipElement) chipElement.focus();
				}
			},
			[checked.index, chips, setChecked]
		);

		// Handle button clicks
		const handleButtonClick = direction => {
			const multiplier = direction === "LEFT" ? -1 : 1;
			containerRef.current.scrollBy({
				left: multiplier * (containerRef.current.clientWidth / 2),
				behavior: "smooth"
			});
		};

		const clickCallback = (index, label) => {
			if (scrollLeft === containerRef.current.scrollLeft) setChecked({ index, label });

			if (section) section.scrollTo(null, 0);
		};

		return Spicetify.React.createElement(
			"div",
			{ className: "search-searchCategory-SearchCategory encore-dark-theme" },
			Spicetify.React.createElement(
				"div",
				{ className: "search-searchCategory-wrapper contentSpacing" },
				Spicetify.React.createElement(
					"div",
					{
						className: `search-searchCategory-contentArea
						${showLeftButton ? "search-searchCategory-showLeftButton" : ""}
						${showRightButton ? "search-searchCategory-showRightButton" : ""}
						${showRightButton && showLeftButton ? "search-searchCategory-showLeftButton search-searchCategory-showRightButton" : ""}`
							.trim()
							.replace(/\s+/g, " ")
					},
					Spicetify.React.createElement(
						"div",
						{
							ref: containerRef,
							className: "search-searchCategory-categoryGrid",
							onScroll: handleResize,
							onKeyDown: handleKeyDown,
							role: "list",
							tabIndex: 0,
							onMouseDown: handleMouseDown
						},
						Spicetify.React.createElement(
							"div",
							{ role: "presentation" },
							chips.map((chip, index) =>
								Spicetify.React.createElement(
									"a",
									{
										key: index,
										draggable: "false",
										className: "search-searchCategory-categoryGridItem",
										tabIndex: "-1",
										onClick: () => clickCallback(index, chip.label)
									},
									Spicetify.React.createElement(
										Spicetify.ReactComponent.Chip,
										{
											isUsingKeyboard: false,
											onClick: () => clickCallback(index, chip.label),
											selected: checked.index === index,
											selectedColorSet: "invertedLight",
											tabIndex: "-1"
										},
										chip.label
									)
								)
							)
						)
					),
					Spicetify.React.createElement(
						"div",
						{ className: "search-searchCategory-carousel" },
						Spicetify.React.createElement(
							"button",
							{
								className: `search-searchCategory-carouselButton search-searchCategory-carouselButtonLeft`,
								tabIndex: -1,
								onClick: () => handleButtonClick("LEFT"),
								inert: true
							},
							Spicetify.React.createElement("svg", {
								viewBox: "0 0 16 16",
								className: "Svg-img-icon-small-textBase",
								dangerouslySetInnerHTML: { __html: Spicetify.SVGIcons["chevron-left"] }
							})
						),
						Spicetify.React.createElement(
							"button",
							{
								className: `search-searchCategory-carouselButton search-searchCategory-carouselButtonRight`,
								tabIndex: -1,
								onClick: () => handleButtonClick("RIGHT"),
								inert: true
							},
							Spicetify.React.createElement("svg", {
								viewBox: "0 0 16 16",
								className: "Svg-img-icon-small-textBase",
								dangerouslySetInnerHTML: { __html: Spicetify.SVGIcons["chevron-right"] }
							})
						)
					)
				)
			)
		);
	};

	const Content = () => {
		const defaultFilter = sessionStorage.getItem("comfy-settings-filter") ? JSON.parse(sessionStorage.getItem("comfy-settings-filter")) : null;
		if (defaultFilter?.label === "Colorscheme") defaultFilter.label = "Colors";
		const [filter, setFilter] = Spicetify.React.useState(defaultFilter ?? { index: 0, label: "All" });

		Spicetify.React.useEffect(() => {
			if (startup) {
				return;
			}
			sessionStorage.setItem("comfy-settings-filter", JSON.stringify(filter));
		}, [filter]);

		return Spicetify.React.createElement(
			"div",
			{ className: "comfy-settings" },
			Spicetify.React.createElement(Carousel, {
				chips: [
					{ label: "All" },
					{ label: "Settings" },
					{ label: "Banner Image" },
					{ label: "Cover Art" },
					{ label: "Now Playing" },
					{ label: "Playbar" },
					{ label: "Tracklist" },
					{ label: "Interface" },
					{ label: "Colors" }
				],
				checked: filter,
				setChecked: setFilter
			}),
			Spicetify.React.createElement(Section, { name: "Now Playing", filter }, [
				{
					type: Toggle, name: "NPV-Artwork-Enabled", title: "Album Art Background",
					desc: "A static, processed cover behind Now Playing. Updates after a 500 ms pause between skips.",
					defaultVal: false, callback: () => nowPlayingArtwork.configure()
				},
				...[
					["Blur", "Background Blur", "Blur in pixels at the fixed 512-pixel working size.", 32, 0, 80],
					["Brightness", "Background Brightness", "Percent brightness before automatic contrast protection.", 65, 0, 150],
					["Saturation", "Background Saturation", "Percent saturation; 0 is grayscale and 100 is unchanged.", 110, 0, 200],
					["Card-Darkening", "Section Card Darkening", "Darkens Artist, Credits, On Tour, Merch, Queue, and Related Music Videos cards while preserving their outlines.", 45, 0, 95]
				].map(([key, title, desc, defaultVal, min, max]) => ({
					type: Input, inputType: "number", name: `NPV-Artwork-${key}`,
					title, desc, defaultVal, min, max, step: 1,
					callback: () => nowPlayingArtwork.configure()
				})),
				{
					type: Toggle, name: "NPV-Artwork-Auto-Contrast", title: "Protect Background Text Contrast",
					desc: "Further darkens or lightens bright/dark artwork for the theme's text colors. May limit the brightness setting.",
					defaultVal: true, callback: () => nowPlayingArtwork.configure()
				},
				{
					type: Toggle, name: "NPV-Artwork-Fade", title: "Fade Between Covers",
					desc: "A short fade while Spotify is focused. Respects reduced motion.",
					defaultVal: true, callback: () => nowPlayingArtwork.configure()
				}
			]),
			Spicetify.React.createElement(Section, { name: "Colors", filter }, [
				{
					type: Dropdown,
					name: `Scheme-Features`,
					title: `Additional Features`,
					description: "Extra tweaks to complete specific color schemes",
					options: ["nord", "nord-flat", "kitty"],
					callback: (name, value, options, defaultVal) => {
						waitForDeps(
							"main",
							main => {
								main.classList.remove(...options.map(option => `Comfy-${option}-Snippet`));
								if (value !== defaultVal) main.classList.add(`Comfy-${value}-Snippet`);
							},
							true,
							"getElementById"
						);
					}
				},
				{
					type: Dropdown,
					name: "Flatten-Colors",
					title: "Flatten Theme Colors",
					desc: "Sets main color to the same color as sidebar",
					defaultVal: "off",
					options: ["off", "normal", "reverse"],
					callback: (name, value, options, defaultVal) => {
						waitForDeps(
							"main",
							main => {
								main.classList.remove(...options.map(option => `${name}-${option}`));
								if (value !== defaultVal) main.classList.add(`${name}-${value}`);
							},
							true,
							"getElementById"
						);
					}
				},
				{
					type: Dropdown,
					name: "Dark-Modals",
					title: "Modal Colors",
					desc: "Forces modals to be dark/light, useful for light mode schemes",
					defaultVal: "light",
					options: ["light", "dark"],
					callback: (name, value, options, defaultVal) => {
						waitForDeps(
							"main",
							main => {
								const customXpui = document.getElementById("/xpui.css");

								if (value === defaultVal && customXpui) {
									customXpui.remove();
									main.classList.remove(`Comfy-${name}-Snippet`);
								}

								if (value !== defaultVal && !customXpui) {
									fetch("xpui.css")
										.then(res => res.text())
										.then(text => {
											const result = text.replace(
												/(\.encore-dark-theme,\.encore-dark-theme)/g,
												".GenericModal__overlay .encore-light-theme,dialog .encore-light-theme,$1"
											);

											const newStyle = document.createElement("style");
											newStyle.textContent = result;
											newStyle.id = "/xpui.css";
											document.head.appendChild(newStyle);
											main.classList.add(`Comfy-${name}-Snippet`);
										})
										.catch(e => console.error(`[Comfy-Error]: ${name}`, e));
								}
							},
							true,
							"getElementById"
						);
					}
				}
			]),
			Spicetify.React.createElement(Section, { name: "Interface", filter }, [
				{
					type: Input,
					inputType: "text",
					name: "App-Title",
					title: "Application Title",
					defaultVal: Spicetify.AppTitle?.get(),
					desc: "Change the title of the application, leave blank to reset",
					callback: value => {
						waitForDeps("Spicetify.Platform.UserAPI._product_state || Spicetify.Platform.UserAPI._product_state_service", async productState => {
							try {
								await productState.delOverridesValues({ keys: ["name"] });
								if (value) await productState.putOverridesValues({ pairs: { name: value } });
							} catch (error) {
								console.warn("[Comfy-Warning]: Could not update the idle application title", error);
							}
						});
					}
				},
				{
					type: Input,
					inputType: "number",
					name: "App-Titlebar-Height",
					title: "Titlebar Height",
					defaultVal: Spicetify.Platform.version >= "1.2.46.462" ? "64" : "40",
					min: "0",
					condition: Spicetify.Platform.version >= "1.2.32.997",
					callback: (value, name, defaultVal) => updateTitlebar(value, defaultVal),
					callbackOverride: true
				},
				{
					type: Input,
					inputType: "number",
					name: "Button-Radius",
					title: "Button Radius",
					defaultVal: "8",
					min: "0",
					tippy: Spicetify.React.createElement(
						Spicetify.React.Fragment,
						null,
						Spicetify.React.createElement("h4", null, "Change how circular buttons are:"),
						Spicetify.React.createElement("li", null, "Comfy default: 8px"),
						Spicetify.React.createElement("li", null, "Spotify default: 50px")
					),
					callback: value => document.documentElement.style.setProperty("--button-radius", value ? value + "px" : "")
				},
				{
					type: SubSection,
					name: "Topbar-Inside-Titlebar-Snippet",
					title: "Move Topbar Inside Titlebar",
					defaultVal: false,
					condition: Spicetify.Platform.version <= "1.2.46.462" && !document.querySelector(":root .global-nav"),
					callback: value => {
						if (document.querySelector(":root .global-nav")) return;

						waitForDeps(
							[".Root__top-container", ".main-topBar-container"],
							elements => {
								const [container, topbar] = elements;
								const entryPoint = document.querySelector(".Root__top-bar") ?? document.querySelector(".Root__main-view");
								const grid = value ? container : entryPoint;

								grid.insertBefore(topbar, grid.firstChild);
							},
							true
						);
					},
					items: [
						{
							type: Toggle,
							name: "Collapse-Topbar-Snippet",
							title: "Collapse List Items",
							defaultVal: true
						}
					],
					collapseItems: true
				},
				{
					type: Toggle,
					name: "Remove-DJ-Prompt",
					title: "Remove your DJ prompt",
					desc: "Hides the prompt 'Click to start listening' in the library",
					defaultVal: true
				},
				{
					type: Toggle,
					name: "Compact-Context-Menu",
					title: "Compact Context Menu",
					defaultVal: true
				},
				{
					type: SubSection,
					name: "Custom-Font",
					title: "Custom Font",
					defaultVal: false,
					callback: value => {
						if (!value) {
							document.documentElement.style.setProperty("--font-family", "");
							document.documentElement.style.setProperty("--encore-title-font-stack", "");
							document.documentElement.style.setProperty("--encore-body-font-stack", "");
						}
					},
					tippy: Spicetify.React.createElement(
						Spicetify.React.Fragment,
						null,
						Spicetify.React.createElement("h4", null, "Usage:"),
						Spicetify.React.createElement("li", null, "Font Name (if installed)"),
						Spicetify.React.createElement("li", null, "URL (Google Fonts)")
					),
					items: [
						{
							type: Input,
							inputType: "text",
							name: "Font",
							title: "Font",
							defaultVal: "Placeholder",
							callback: value => {
								let fontFamily = value;
								if (isValidUrl(value)) {
									fontFamily = decodeURIComponent(value.match(/family=([^&:]+)/)?.[1]?.replace(/\+/g, " "));
									if (!document.getElementById("custom-font")) {
										const link = document.createElement("link");
										link.rel = "preload stylesheet";
										link.as = "style";
										link.href = value;
										link.id = "custom-font";
										document.head.appendChild(link);
									} else {
										document.getElementById("custom-font").href = value;
									}
								}
								document.documentElement.style.setProperty("--font-family", fontFamily);
								document.documentElement.style.setProperty("--encore-title-font-stack", fontFamily);
								document.documentElement.style.setProperty("--encore-body-font-stack", fontFamily);
							}
						}
					]
				},
				{
					type: SubSection,
					name: "Home-Header-Snippet",
					title: "Colorful Home Header",
					defaultVal: true,
					callback: value => {
						if (!value) {
							waitForDeps(
								"main",
								main => {
									main.classList.remove("Home-Header-Snippet");
									document.documentElement.style.setProperty("--home-header-color", "");
								},
								true,
								"getElementById"
							);
						}
					},
					items: [
						{
							type: Input,
							inputType: "text",
							includePicker: true,
							name: "Home-Header-Color",
							title: "Custom Color",
							defaultVal: "none",
							tippy: Spicetify.React.createElement(
								Spicetify.React.Fragment,
								null,
								Spicetify.React.createElement("li", null, "name (red, blue, (--var), etc)"),
								Spicetify.React.createElement("li", null, "hex (#000000)"),
								Spicetify.React.createElement("li", null, "rgb (0, 0, 0)"),
								Spicetify.React.createElement("li", null, "rgba (0, 0, 0, 1)")
							),
							callback: (value, name) => {
								waitForDeps(
									"main",
									main => {
										document.documentElement.style.setProperty("--home-header-color", value);

										if (value === "") {
											main.classList.remove(name);
										} else {
											main.classList.add(name);
										}
									},
									true,
									"getElementById"
								);
							}
						}
					],
					collapseItems: true
				},
				{
					type: Toggle,
					name: "Horizontal-pageLinks-Snippet",
					title: "Horizontal Page Links",
					defaultVal: false,
					condition: Spicetify.Platform.version <= "1.2.46.462" && !document.querySelector(":root .global-nav")
				}
			]),
			Spicetify.React.createElement(Section, { name: "Tracklist", filter }, [
				{
					type: Toggle,
					name: "Remove-Tracklist-Index",
					title: "Remove Tracklist Index",
					desc: "Hides the numbers / count next to songs",
					defaultVal: true
				},
				{
					type: Toggle,
					name: "Remove-Column-Bar-Snippet",
					title: "Remove Column Bar",
					desc: "Hides the column bar above tracklist",
					defaultVal: true
				},
				{
					type: Toggle,
					name: "Remove-Tracklist-Gradient-Noise",
					title: "Remove Gradient Noise",
					defaultVal: false,
					desc: "Remove the noise from the gradient",
					callback: value => {
						document.documentElement.style.setProperty("--tracklist-gradient-noise", value ? "none" : "");
					}
				},
				{
					type: Input,
					inputType: "number",
					name: "Tracklist-Gradient-Height",
					title: "Gradient Height",
					defaultVal: "232",
					min: "0",
					desc: "Change the height of the gradient (the transparent part of the tracklist)",
					tippy: Spicetify.React.createElement(
						Spicetify.React.Fragment,
						null,
						Spicetify.React.createElement("h4", null, "Set to 0 to disable the gradient!")
					),
					callback: value => document.documentElement.style.setProperty("--tracklist-gradient-height", value ? value + "px" : "")
				},
				{
					type: Input,
					inputType: "number",
					name: "Tracklist-Gradient-Opacity",
					title: "Gradient Opacity",
					defaultVal: "0.6",
					min: "0",
					max: "1",
					step: "0.1",
					desc: "Change the opacity of the gradient (0 -> 1)",
					tippy: Spicetify.React.createElement(
						Spicetify.React.Fragment,
						null,
						Spicetify.React.createElement("h4", null, "Set to 0 for no gradient color!")
					),
					callback: value => document.documentElement.style.setProperty("--tracklist-gradient-opacity", value || "")
				}
			]),
			Spicetify.React.createElement(Section, { name: "Playbar", filter }, [
				{
					type: Toggle,
					name: "Custom-Playbar-Snippet",
					title: "Custom Playbar Layout",
					defaultVal: true,
					desc: "Comfy's out of box playbar design"
				},
				{
					type: Toggle,
					name: "Playbar-Above-Right-Panel-Snippet",
					title: "Above Right Panel",
					desc: "Moves the playbar above the right panel",
					defaultVal: false,
					condition: Spicetify.Platform.version <= "1.2.46.462" && !document.querySelector(":root .global-nav"),
					callback: value => {
						waitForDeps(
							".Root__top-container",
							topContainer => {
								const playbar = topContainer.querySelector(".Root__now-playing-bar");

								if (value) {
									const rightbar = topContainer.querySelector(".Root__right-sidebar");
									const resizeObserver = new ResizeObserver(entries => {
										if (getConfig("Playbar-Above-Right-Panel-Snippet")) {
											for (let entry of entries) {
												if (entry.target === rightbar) {
													let newWidth = entry.contentRect.width;
													if (newWidth == 0) {
														const localStorageWidth = localStorage.getItem("223ni6f2epqcidhx5etjafeai:panel-width-saved");
														if (localStorageWidth) {
															newWidth = localStorageWidth;
														} else {
															newWidth = 420;
														}
													}
													playbar.style.width = `${newWidth}px`;
													break;
												}
											}
										} else {
											resizeObserver.disconnect();
										}
									});

									resizeObserver.observe(rightbar);
								} else {
									playbar.style.width = "";
								}
							},
							true
						);
					}
				},
				{
					type: Toggle,
					name: "Smooth-Progress-Bar-Snippet",
					title: "Smooth Progress Bar",
					desc: "Makes the progress bar ease its movement giving the appearance of a smoother transition",
					defaultVal: true
				},
				{
					type: Toggle,
					name: "Hoverable-Timers-Snippet",
					title: "Hoverable Playback Timers",
					defaultVal: false
				},
				{
					type: Toggle,
					name: "Remove-Connect-Bar-Snippet",
					title: "Remove Connect Bar",
					defaultVal: false
				},
				{
					type: Toggle,
					name: "Remove-Progress-Bar-Gradient-Snippet",
					title: "Remove Progress Bar Gradient",
					defaultVal: false
				},
				{
					type: Toggle,
					name: "Remove-Lyrics-Button-Snippet",
					title: "Remove Lyrics Button",
					defaultVal: false
				}
			]),
			Spicetify.React.createElement(Section, { name: "Cover Art", filter }, [
				{
					type: SubSection,
					name: "Custom-Cover-Art-Dimensions",
					title: "Custom Dimensions",
					defaultVal: false,
					callback: value => {
						if (!value) {
							document.documentElement.style.setProperty("--cover-art-width", "");
							document.documentElement.style.setProperty("--cover-art-height", "");
							document.documentElement.style.setProperty("--cover-art-radius", "");
							document.documentElement.style.setProperty("--cover-art-left", "");
							document.documentElement.style.setProperty("--cover-art-bottom", "");
						}
					},
					tippy: Spicetify.React.createElement(
						Spicetify.React.Fragment,
						null,
						Spicetify.React.createElement("h4", null, "Change the size of the cover art:"),
						Spicetify.React.createElement("li", null, "Comfy default: (84px, 84px, 8px, 20px)"),
						Spicetify.React.createElement("li", null, "Spotify default: (56px, 56px, 4px, 0px)"),
						Spicetify.React.createElement("li", null, "Oblong: (115px, 84px, 15px, 20px)")
					),
					items: [
						{
							type: Input,
							inputType: "number",
							name: "Cover-Art-Width",
							title: "Width",
							defaultVal: "84px",
							min: "0",
							callback: value => document.documentElement.style.setProperty("--cover-art-width", value ? value + "px" : "")
						},
						{
							type: Input,
							inputType: "number",
							name: "Cover-Art-Height",
							title: "Height",
							defaultVal: "84px",
							min: "0",
							callback: value => document.documentElement.style.setProperty("--cover-art-height", value ? value + "px" : "")
						},
						{
							type: Input,
							inputType: "number",
							name: "Cover-Art-Radius",
							title: "Border Radius",
							defaultVal: "8px",
							min: "0",
							callback: value => document.documentElement.style.setProperty("--cover-art-radius", value ? value + "px" : "")
						},
						{
							type: Input,
							inputType: "number",
							name: "Cover-Art-Left",
							title: "Left Margin",
							defaultVal: "0px",
							desc: "Change the distance between the cover art and the left of the playbar",
							callback: value => document.documentElement.style.setProperty("--cover-art-left", value ? value + "px" : "")
						},
						{
							type: Input,
							inputType: "number",
							name: "Cover-Art-Bottom",
							title: "Bottom Margin",
							defaultVal: "20px",
							tippy: Spicetify.React.createElement(
								Spicetify.React.Fragment,
								null,
								Spicetify.React.createElement("li", null, "Comfy default: 20px"),
								Spicetify.React.createElement("li", null, "Spotify default: 0px")
							),
							desc: "Change the distance between the cover art and the bottom of the playbar",
							callback: value => document.documentElement.style.setProperty("--cover-art-bottom", value ? value + "px" : "")
						}
					]
				}
			]),
			Spicetify.React.createElement(Section, { name: "Banner Image", filter }, [
				{
					type: SubSection,
					name: "Header-Background",
					title: "Header Background",
					desc: "Adds a translucent background behind header text and images",
					defaultVal: false,
					callback: value => {
						if (!value) {
							document.documentElement.style.setProperty("--header-opacity", "");
						}
					},
					items: [
						{
							type: Input,
							inputType: "number",
							name: "Header-Background-Opacity",
							title: "Opacity",
							defaultVal: "0.6",
							callback: value => document.documentElement.style.setProperty("--header-opacity", value ? value : "")
						}
					],
					collapseItems: false
				},
				{
					type: SubSection,
					name: "Banner-Enabled",
					title: "Custom Banner Images",
					defaultVal: true,
					desc: "(all settings in this category will be ignored if disabled)",
					callback: syncBannerRuntime,
					items: Object.keys(channels).map(channel => ({
						type: Toggle,
						name: channel,
						title: `${channel.replace("-", " ")} Page`,
						defaultVal: channels[channel]["enabled"],
						callback: value => {
							if (value !== channels[channel]["enabled"]) {
								channels[channel]["enabled"] = value;
								updateBanner();
							}
						}
					})),
					collapseItems: true
				},
				{
					type: Toggle,
					name: "Replace-Existing-Banners",
					title: "Replace Existing Banners",
					defaultVal: false,
					desc: "Replace any existing banners with our own - e.g artist banners, playlist banners, etc.",
					callback: updateBanner
				},
				{
					type: Toggle,
					name: "Prefer-Existing-Image",
					title: "Prefer Existing Image",
					defaultVal: false,
					desc: "If available, use existing images instead of the current playing song - e.g playlist image, album art, etc.",
					callback: syncBannerRuntime
				},
				{
					type: SubSection,
					name: "Apple-Music-Gradient-Snippet",
					title: "Apple Music Gradient",
					defaultVal: false,
					callback: value => {
						if (!value) {
							document.documentElement.style.setProperty("--gradient-background-image", "");
							document.documentElement.style.setProperty("--gradient-blend-mode", "");
							document.documentElement.style.setProperty("--gradient-speed", "");
							document.documentElement.style.setProperty("--gradient-width", "");
							document.documentElement.style.setProperty("--gradient-radius", "");
						}
						syncBannerRuntime();
					},
					tippy: Spicetify.React.createElement(
						Spicetify.React.Fragment,
						null,
						Spicetify.React.createElement("h4", null, "MacOS Note:"),
						Spicetify.React.createElement("li", null, "Disable Reduced Motion in System Preferences"),
						Spicetify.React.createElement("h4", null, "Blur (10x Value):"),
						Spicetify.React.createElement("li", null, "Recommended: 4px")
					),
					items: [
						{
							type: Toggle,
							name: "AM-Gradient-Include-Existing-Snippet",
							title: "Existing Banners",
							defaultVal: false,
							desc: "Apply the gradient to existing banners on the page (e.g. artist banners)",
							callback: syncBannerRuntime
						},
						{
							type: Input,
							inputType: "text",
							name: "Gradient-Noise",
							title: "Noise URL",
							defaultVal: "none",
							desc: "Overlays an image below the blur and over the art, can be used for noise",
							callback: value => document.documentElement.style.setProperty("--gradient-background-image", value ? `url('${value}')` : "")
						},
						{
							type: Input,
							inputType: "text",
							name: "Gradient-Blend",
							title: "Blend Mode",
							defaultVal: "luminosity",
							desc: "'difference' works well with noise",
							callback: value => document.documentElement.style.setProperty("--gradient-blend-mode", value || "")
						},
						{
							type: Input,
							inputType: "number",
							name: "Gradient-Speed",
							title: "Speed",
							defaultVal: "50",
							min: "0",
							tippy: Spicetify.React.createElement(
								Spicetify.React.Fragment,
								null,
								Spicetify.React.createElement("h4", null, "Seconds per full rotation (360°):"),
								Spicetify.React.createElement("li", null, "Comfy default: 50")
							),
							callback: value => document.documentElement.style.setProperty("--gradient-speed", value ? value + "s" : "")
						},
						{
							type: Input,
							inputType: "number",
							name: "Gradient-Size",
							title: "Size",
							defaultVal: "150",
							min: "0",
							tippy: Spicetify.React.createElement(
								Spicetify.React.Fragment,
								null,
								Spicetify.React.createElement("h4", null, "Width of circles in relation to viewport (in %)"),
								Spicetify.React.createElement("li", null, "Comfy default: 150")
							),
							callback: value => document.documentElement.style.setProperty("--gradient-width", value ? value + "%" : "")
						},
						{
							type: Input,
							inputType: "number",
							name: "Gradient-Radius",
							title: "Radius",
							desc: "Radius of circles (in %)",
							defaultVal: "50",
							min: "0",
							callback: value => document.documentElement.style.setProperty("--gradient-radius", value ? value + "%" : "")
						}
					],
					collapseItems: true
				},
				{
					type: SubSection,
					name: "Custom-Image",
					title: "Custom Image",
					defaultVal: false,
					callback: updateBanner,
					items: [
						{
							type: Input,
							inputType: "text",
							name: "Custom-Image-URL",
							title: "URL",
							defaultVal: "Paste URL here!",
							tippy: Spicetify.React.createElement(
								Spicetify.React.Fragment,
								null,
								Spicetify.React.createElement("h4", null, "Network Images:"),
								Spicetify.React.createElement("li", null, "Enter any raw image url into text box, e.g. 'https://example.com/image.png'"),
								Spicetify.React.createElement("h4", null, "Local Images:"),
								Spicetify.React.createElement("li", null, "Place desired image in 'spotify/Apps/xpui/images'"),
								Spicetify.React.createElement("li", null, "Enter 'images/image.png' into text box")
							),
							callback: updateBanner
						}
					]
				},
				{
					type: Input,
					inputType: "number",
					name: "Image-Blur",
					title: "Image Blur",
					defaultVal: "4",
					min: "0",
					tippy: Spicetify.React.createElement(
						Spicetify.React.Fragment,
						null,
						Spicetify.React.createElement("h4", null, "Amount of banner blur in pixels:"),
						Spicetify.React.createElement("li", null, "Comfy default: 4px")
					),
					callback: value => document.documentElement.style.setProperty("--image-blur", value ? value + "px" : "")
				}
			]),
			Spicetify.React.createElement(Section, { name: "Settings", filter }, [
				{
					type: Row,
					name: "setting-card setting-button-row",
					items: [
						{
							type: Button,
							name: "Import",
							title: "Import",
							callback: async (state, setState) => {
								const paste = await Spicetify.Platform.ClipboardAPI.paste();
								try {
									JSON.parse(paste);
									setState("Success!");

									new Promise(resolve => setTimeout(resolve, 500)).then(() => {
										localStorage.setItem("comfy:config", paste);
										location.reload();
									});
								} catch (e) {
									setState("Invalid!");
									new Promise(resolve => setTimeout(resolve, 2000)).then(() => {
										setState(state);
									});
								}
							}
						},
						{
							type: Button,
							name: "Export",
							title: "Export",
							callback: (state, setState) => {
								Spicetify.Platform.ClipboardAPI.copy(localStorage.getItem("comfy:config"));
								setState("Copied!");

								new Promise(resolve => setTimeout(resolve, 2000)).then(() => {
									setState(state);
								});
							}
						},
						{
							type: Button,
							name: "Reset",
							title: "Reset",
							callback: () => {
								const settings = document.querySelector(".GenericModal__overlay:has(.comfy-settings)");
								Spicetify.ReactDOM.render(
									Spicetify.React.createElement(
										Spicetify.ReactComponent.RemoteConfigProvider,
										{ configuration: Spicetify.Platform.RemoteConfiguration },
										Spicetify.React.createElement(Dialog, {
											titleText: "Are you sure?",
											descriptionText: "This will reset all settings to default!",
											cancelText: "Cancel",
											confirmText: "Reset",
											onOpen: () => {
												settings.style.zIndex = 0;
											},
											onClose: () => {
												settings.style.zIndex = 100;
											},
											onConfirm: () => {
												localStorage.removeItem("comfy:config");
												location.reload();
											}
										})
									),
									document.createElement("div")
								);
							}
						}
					]
				}
			])
		);
	};

	// Settings Button + Modal
	waitForDeps("Spicetify.Topbar.Button", () => {
		new Spicetify.Topbar.Button(
			"Comfy Settings",
			`<svg viewBox="0 0 262.394 262.394" style="width: 16px; height: 16px; fill: currentcolor"><path d="M245.63,103.39h-9.91c-2.486-9.371-6.197-18.242-10.955-26.432l7.015-7.015c6.546-6.546,6.546-17.159,0-23.705 l-15.621-15.621c-6.546-6.546-17.159-6.546-23.705,0l-7.015,7.015c-8.19-4.758-17.061-8.468-26.432-10.955v-9.914 C159.007,7.505,151.502,0,142.244,0h-22.091c-9.258,0-16.763,7.505-16.763,16.763v9.914c-9.37,2.486-18.242,6.197-26.431,10.954 l-7.016-7.015c-6.546-6.546-17.159-6.546-23.705,0.001L30.618,46.238c-6.546,6.546-6.546,17.159,0,23.705l7.014,7.014 c-4.758,8.19-8.469,17.062-10.955,26.433h-9.914c-9.257,0-16.762,7.505-16.762,16.763v22.09c0,9.258,7.505,16.763,16.762,16.763 h9.914c2.487,9.371,6.198,18.243,10.956,26.433l-7.015,7.015c-6.546,6.546-6.546,17.159,0,23.705l15.621,15.621 c6.546,6.546,17.159,6.546,23.705,0l7.016-7.016c8.189,4.758,17.061,8.469,26.431,10.955v9.913c0,9.258,7.505,16.763,16.763,16.763 h22.091c9.258,0,16.763-7.505,16.763-16.763v-9.913c9.371-2.487,18.242-6.198,26.432-10.956l7.016,7.017 c6.546,6.546,17.159,6.546,23.705,0l15.621-15.621c3.145-3.144,4.91-7.407,4.91-11.853s-1.766-8.709-4.91-11.853l-7.016-7.016 c4.758-8.189,8.468-17.062,10.955-26.432h9.91c9.258,0,16.763-7.505,16.763-16.763v-22.09 C262.393,110.895,254.888,103.39,245.63,103.39z M131.198,191.194c-33.083,0-59.998-26.915-59.998-59.997 c0-33.083,26.915-59.998,59.998-59.998s59.998,26.915,59.998,59.998C191.196,164.279,164.281,191.194,131.198,191.194z"/><path d="M131.198,101.199c-16.541,0-29.998,13.457-29.998,29.998c0,16.54,13.457,29.997,29.998,29.997s29.998-13.457,29.998-29.997 C161.196,114.656,147.739,101.199,131.198,101.199z"/></svg>`,
			() => {
				// Reset startup preventions
				startup = false;

				// Trigger Modal + Modal Styling
				document.getElementById("main").classList.add("Settings-Open");

				Spicetify.PopupModal.display({
					title: "Comfy Settings",
					content: Spicetify.React.createElement(Content),
					isLarge: true
				});

				const modal = document.querySelector("generic-modal:has(.comfy-settings)");
				if (!modal) return;
				modal.classList.add("comfy-modal");
				const cleanup = new MutationObserver(() => {
					if (!modal.isConnected) {
						document.getElementById("main")?.classList.remove("Settings-Open");
						cleanup.disconnect();
					}
				});
				cleanup.observe(document.body, { childList: true });
				const section = modal.querySelector(".main-trackCreditsModal-mainSection");
				if (!section) return;
				const cache = Number(sessionStorage.getItem("comfy-settings-scroll")) || 0;
				section.scrollTop = Math.max(0, Math.min(1, cache)) * (section.scrollHeight - section.clientHeight);
				section.addEventListener("scroll", () => {
					const range = section.scrollHeight - section.clientHeight;
					sessionStorage.setItem("comfy-settings-scroll", range > 0 ? section.scrollTop / range : 0);
				});
			},
			false,
			true
		);
	});

	// Preloading settings
	console.debug("[Comfy-Event]: Settings Preload Started");
	Spicetify.ReactDOM.render(Spicetify.React.createElement(Content), preloadContainer);
	Spicetify.ReactDOM.unmountComponentAtNode(preloadContainer);

	// Functions
	function getConfig(key) {
		return config[key] ?? null;
	}

	function setConfig(key, value, message, silent) {
		if (value !== getConfig(key)) {
			if (!silent) console.debug(`[Comfy-Config]: ${message ?? key + " ="}`, value);
			config[key] = value;
			localStorage.setItem("comfy:config", JSON.stringify(config));
		}
	}

	function isPromise(p) {
		if (p != null && typeof p.then === "function") {
			return true;
		}
		return false;
	}

	function isValidUrl(urlString) {
		try {
			return Boolean(new URL(urlString));
		} catch (e) {
			return false;
		}
	}

	function readDependency(expression) {
		for (const path of expression.split("||")) {
			const value = path.trim().split(".").reduce((object, key) => object?.[key], globalThis);
			if (value) return value;
		}
	}

	async function waitForDeps(dependencies, callback, element = false, elementType = "querySelector", timeout = 5000) {
		const paths = Array.isArray(dependencies) ? dependencies : [dependencies];
		const started = Date.now();
		while (true) {
			const values = paths.map(path => element ? document[elementType](path) : readDependency(path));
			if (values.every(value => value && (!element || elementType !== "querySelectorAll" || value.length > 0))) {
				try {
					await callback?.(Array.isArray(dependencies) ? values : values[0]);
					return true;
				} catch (error) {
					console.warn("[Comfy-Warning]: Feature could not be initialized", dependencies, error);
					return false;
				}
			}
			if (Date.now() - started >= timeout) {
				console.warn("[Comfy-Warning]: Dependency unavailable", dependencies);
				return false;
			}
			await new Promise(resolve => setTimeout(resolve, 100));
		}
	}

	async function updateTitlebar(value, defaultVal) {
		const height = Number(value || defaultVal);
		if (!Number.isFinite(height) || height < 0) return;
		document.documentElement.style.setProperty("--comfy-topbar-height", value ? `${height}px` : "");
		// The native container/control resolver is absent on Spotify 1.2.98 for macOS.
		if (document.documentElement.classList.contains("spotify__os--is-macos")) return;
		await waitForDeps("Spicetify.CosmosAsync", cosmos => cosmos.post("sp://messages/v1/container/control", {
			type: "update_titlebar", height: `${height || 1}px`
		}));
	}

	function createNowPlayingArtwork() {
		const hostSelector = ".Root__right-sidebar .NowPlayingView";
		const shellSelector = ".Root__right-sidebar, .Root__right-sidebar-peek, .Root__right-sidebar-overlayWrapper, .Root__right-sidebar-peekContent, .main-nowPlayingView-container";
		let enabled = false, player, root, host, observer, options;
		let revision = 0, pendingKey = "", renderedKey = "";
		let delayTimer, readyTimer, loadTimer, fadeTimer, loadingImage, current, outgoing, animation;
		let suspended = true;

		function numberSetting(key, fallback, min, max) {
			const raw = getConfig(`NPV-Artwork-${key}`);
			const value = raw === "" || raw == null ? fallback : Number(raw);
			return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
		}

		function readOptions() {
			return {
				blur: numberSetting("Blur", 32, 0, 80),
				brightness: numberSetting("Brightness", 65, 0, 150),
				saturation: numberSetting("Saturation", 110, 0, 200),
				card: numberSetting("Card-Darkening", 45, 0, 95),
				contrast: getConfig("NPV-Artwork-Auto-Contrast") ?? true,
				fade: getConfig("NPV-Artwork-Fade") ?? true
			};
		}

		function readSource() {
			// Use player artwork directly; do not fetch album metadata or borrow the
			// page banner. A local track can still provide a usable ordinary image URL.
			const data = player?.data;
			const metadata = data?.item?.metadata || data?.track?.metadata;
			const source = normalizeImage(metadata?.image_large_url || metadata?.image_xlarge_url ||
				metadata?.image_url || metadata?.image_small_url);
			// Spotify's native local-cover scheme rejects our CORS image request.
			// Skip it before allocating a loader, restoring the normal theme without
			// console errors. Check the scheme, not OS-specific paths; removing CORS
			// is not a substitute for the readable pixels auto-contrast requires.
			return source?.startsWith("spotify:localfileimage:") ? null : source;
		}

		function release(canvas) {
			if (!canvas) return;
			canvas.remove();
			// Release the pixel backing store as well as the detached DOM node.
			canvas.width = canvas.height = 0;
		}

		function finishFade() {
			clearTimeout(fadeTimer);
			fadeTimer = undefined;
			if (animation) {
				animation.onfinish = null;
				animation.cancel();
				animation = undefined;
			}
			release(outgoing);
			outgoing = undefined;
		}

		function cancelPending() {
			++revision;
			clearTimeout(delayTimer);
			clearTimeout(loadTimer);
			delayTimer = loadTimer = undefined;
			pendingKey = "";
			if (loadingImage) {
				loadingImage.onload = loadingImage.onerror = null;
				loadingImage.removeAttribute("src");
				loadingImage = undefined;
			}
		}

		function clearSurface() {
			finishFade();
			release(current);
			current = undefined;
			renderedKey = "";
			host?.classList.remove("comfy-npv-artwork-active");
		}

		function canRender() {
			return Boolean(host?.isConnected && !document.hidden &&
				!root?.hasAttribute("data-right-sidebar-hidden") &&
				!host.closest('[aria-hidden="true"], .Root__right-sidebar-collapsed'));
		}

		function applyCardSurface() {
			// Scoped to this host; changing card opacity needs no canvas processing.
			host?.style.setProperty("--comfy-npv-card-darkening", String(options.card / 100));
		}

		function syncPanel() {
			if (!enabled || !root) return;
			const nextHost = root.querySelector(hostSelector);
			if (nextHost !== host) {
				cancelPending();
				clearSurface();
				host?.style.removeProperty("--comfy-npv-card-darkening");
				host = nextHost;
				suspended = true;
				applyCardSurface();
			}
			// Observe direct children of the panel's shells only. Track text, cover
			// animations, scroll positions and our canvases are never observed.
			// Rebind when React replaces a shell, including while the panel is closed.
			observer.disconnect();
			observer.observe(root, { childList: true, attributes: true, attributeFilter: ["data-right-sidebar-hidden"] });
			for (const shell of root.querySelectorAll(shellSelector)) {
				const attributes = shell.matches(".Root__right-sidebar-peek, .Root__right-sidebar-peekContent");
				observer.observe(shell, attributes
					? { childList: true, attributes: true, attributeFilter: ["class", "aria-hidden"] }
					: { childList: true });
			}
			updateVisibility();
		}

		function updateVisibility() {
			if (!enabled) return;
			if (!canRender()) {
				suspended = true;
				cancelPending();
				finishFade();
				return;
			}
			const wasSuspended = suspended;
			suspended = false;
			requestArtwork(wasSuspended);
		}

		function onBlur() { finishFade(); }
		function onSongChange() { requestArtwork(false); }

		function requestArtwork(skipFade) {
			if (!enabled || !canRender()) { cancelPending(); return; }
			const source = readSource();
			if (!source) { cancelPending(); clearSurface(); return; }
			const key = JSON.stringify([source, options.blur, options.brightness, options.saturation, options.contrast]);
			// A single equality check avoids needless work for another track from the
			// same album. No multi-cover cache or URI bookkeeping is needed.
			if (key === renderedKey) { cancelPending(); return; }
			if (key === pendingKey) return;
			cancelPending();
			pendingKey = key;
			const job = revision;
			// Trailing debounce: rapid skips and number-field edits process only the
			// latest request. No interval, resize handler or playback-progress listener.
			delayTimer = setTimeout(() => {
				delayTimer = undefined;
				if (job !== revision || !canRender()) return;
				const image = new Image();
				loadingImage = image;
				const fail = () => {
					if (job !== revision) return;
					cancelPending();
					clearSurface();
				};
				image.crossOrigin = "anonymous";
				image.onerror = fail;
				loadTimer = setTimeout(fail, 10000);
				image.onload = () => {
					if (job !== revision || !canRender()) return;
					clearTimeout(loadTimer);
					loadTimer = undefined;
					image.onload = image.onerror = null;
					loadingImage = undefined;
					let canvas;
					try {
						canvas = renderNowPlayingArtwork(image, options);
						if (job !== revision || !canRender()) { release(canvas); return; }
						finishFade();
						outgoing = current;
						current = canvas;
						canvas.className = "comfy-npv-artwork-layer";
						canvas.setAttribute("aria-hidden", "true");
						host.appendChild(canvas);
						host.classList.add("comfy-npv-artwork-active");
						renderedKey = key;
						pendingKey = "";
						if (!skipFade && options.fade && document.hasFocus() &&
							!window.matchMedia("(prefers-reduced-motion: reduce)").matches && canvas.animate) {
							animation = canvas.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: "ease-out" });
							animation.onfinish = finishFade;
							// Bound cleanup even if the renderer suppresses a completion event.
							fadeTimer = setTimeout(finishFade, 400);
						} else finishFade();
					} catch (error) {
						release(canvas);
						fail();
						console.warn("[Comfy-Warning]: Now Playing artwork unavailable", error);
					}
				};
				image.src = source;
			}, 500);
		}

		function attach(attempt = 0) {
			readyTimer = undefined;
			if (!enabled) return;
			player = Spicetify.Player;
			root = document.querySelector(".Root__top-container");
			if (!player?.addEventListener || !player?.removeEventListener || !root) {
				// Startup only, cancellable and bounded like the theme's other waits.
				if (attempt < 50) readyTimer = setTimeout(() => attach(attempt + 1), 100);
				return;
			}
			player.addEventListener("songchange", onSongChange);
			document.addEventListener("visibilitychange", updateVisibility);
			window.addEventListener("blur", onBlur);
			observer = new MutationObserver(syncPanel);
			syncPanel();
		}

		function disable() {
			enabled = false;
			clearTimeout(readyTimer);
			readyTimer = undefined;
			cancelPending();
			observer?.disconnect();
			observer = undefined;
			player?.removeEventListener?.("songchange", onSongChange);
			document.removeEventListener("visibilitychange", updateVisibility);
			window.removeEventListener("blur", onBlur);
			clearSurface();
			host?.style.removeProperty("--comfy-npv-card-darkening");
			host = root = player = undefined;
			suspended = true;
		}

		return {
			configure() {
				options = readOptions();
				if (!getConfig("NPV-Artwork-Enabled")) { if (enabled) disable(); return; }
				if (!enabled) { enabled = true; attach(); return; }
				applyCardSurface();
				if (!options.fade) finishFade();
				requestArtwork(false);
			}
		};
	}

	function renderNowPlayingArtwork(image, options) {
		// 512 retains detail at low blur without a full-resolution panel buffer.
		// The canvas itself is the cached texture: no data URL, Blob URL or live CSS
		// filter. Window resizing only scales/crops this already-processed bitmap.
		const size = 512;
		const canvas = document.createElement("canvas");
		const sample = document.createElement("canvas");
		canvas.width = canvas.height = size;
		sample.width = sample.height = 32;
		try {
			const context = canvas.getContext("2d");
			if (!context || !("filter" in context)) throw new Error("Canvas filters unavailable");
			const padding = Math.ceil(options.blur * 3);
			const scale = Math.max((size + padding * 2) / image.naturalWidth, (size + padding * 2) / image.naturalHeight);
			const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
			context.filter = `blur(${options.blur}px) brightness(${options.brightness}%) saturate(${options.saturation}%)`;
			// Overscan prevents blur sampling transparent pixels at the texture edges.
			context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
			context.filter = "none";
			if (options.contrast) {
				const probe = sample.getContext("2d", { willReadFrequently: true });
				probe.drawImage(canvas, 0, 0, 32, 32);
				const pixels = probe.getImageData(0, 0, 32, 32).data;
				const luminance = (r, g, b) => [r, g, b].reduce((sum, value, i) => {
					const s = value / 255;
					return sum + (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][i];
				}, 0);
				// Active artwork uses white text, with secondary text at 80% opacity
				// (see _now_playing.scss). Test that weaker foreground after compositing
				// it over each background sample, rather than using the INI palette.
				const textOpacity = 0.8;
				// Protect against bright patches, not just average cover brightness.
				// One small readback per cover; this is never called while resizing.
				let alpha = 0;
				for (let i = 0; i < pixels.length; i += 4) {
					while (alpha < 0.95) {
						const r = pixels[i] * (1 - alpha), g = pixels[i + 1] * (1 - alpha), b = pixels[i + 2] * (1 - alpha);
						const foreground = value => 255 * textOpacity + value * (1 - textOpacity);
						const contrast = (luminance(foreground(r), foreground(g), foreground(b)) + 0.05) / (luminance(r, g, b) + 0.05);
						if (contrast >= 4.5) break;
						alpha += 0.025;
					}
				}
				context.fillStyle = "#000000";
				context.globalAlpha = Math.min(alpha, 1);
				context.fillRect(0, 0, size, size);
				context.globalAlpha = 1;
			}
			return canvas;
		} catch (error) {
			canvas.width = canvas.height = 0;
			throw error;
		} finally {
			sample.width = sample.height = 0;
		}
	}

	function normalizeImage(source) {
		if (typeof source !== "string" || !source) return null;
		return source.startsWith("spotify:image:") ? `https://i.scdn.co/image/${source.slice(14)}` : source;
	}

	async function updateBanner() {
		const revision = ++bannerRevision;
		if (!isBannerEnabled()) return;
		if (!await waitForDeps("Spicetify.Platform.History.location")) return;
		const pathname = Spicetify.Platform.History.location.pathname;
		const validChannel = isBannerChannel(pathname);
		if (!validChannel) {
			frame.remove();
			frame.style.display = "none";
			document.getElementById("main")?.classList.remove("Banner-Enabled");
			document.documentElement.style.setProperty("--image-url", "none");
			return;
		}
		mountBanner();
		let source;
		try {
			const isPlaylist = /^\/playlist\//.test(pathname);
			const isAlbum = /^\/album\//.test(pathname);
			const isArtist = /^\/artist\//.test(pathname);
			if (getConfig("Apple-Music-Gradient-Snippet") && getConfig("AM-Gradient-Include-Existing-Snippet")) {
				// Use the image already loaded by Spotify instead of a hard-coded GraphQL hash.
				if (isArtist) source = readHeaderImages().background;
				if (isPlaylist) {
					const playlist = await Spicetify.Platform.PlaylistAPI.getMetadata(`spotify:playlist:${pathname.split("/")[2]}`);
					source = playlist?.images?.[3]?.url || readHeaderImages().background;
				}
			}
			if (!source && getConfig("Custom-Image")) source = getConfig("Custom-Image-URL")?.trim();
			if (!source && isBannerEnabled() && getConfig("Prefer-Existing-Image")) {
				if (isPlaylist) {
					const playlist = await Spicetify.Platform.PlaylistAPI.getMetadata(`spotify:playlist:${pathname.split("/")[2]}`);
					source = playlist?.images?.[0]?.url;
				} else if (isAlbum) {
					// Avoid the public Web API's restricted album endpoint.
					source = readHeaderImages().image;
				}
			}
		} catch (error) {
			console.warn("[Comfy-Warning]: Banner metadata unavailable; using current cover", error);
		}
		if (revision !== bannerRevision) return;
		const data = Spicetify.Player?.data;
		source = normalizeImage(source || data?.item?.metadata?.image_xlarge_url || data?.track?.metadata?.image_xlarge_url);
		frame.style.display = "";
		document.getElementById("main")?.classList.add("Banner-Enabled");
		banner.forEach(image => { image.style.display = source ? "" : "none"; });
		const rootStyle = document.documentElement.style;
		if (!source) {
			rootStyle.setProperty("--image-url", "none");
			return;
		}
		const cssImage = `url(${JSON.stringify(source)})`;
		if (rootStyle.getPropertyValue("--image-url") !== cssImage) {
			const preloadImage = new Image();
			preloadImage.onload = () => {
				if (revision === bannerRevision) rootStyle.setProperty("--image-url", cssImage);
			};
			preloadImage.onerror = () => {
				if (revision === bannerRevision) rootStyle.setProperty("--image-url", "none");
			};
			preloadImage.src = source;
		}
	}

})();
