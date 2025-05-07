import type { ParentComponent } from "solid-js";

const App: ParentComponent = (props) => {
	return (
		<div>
			<header class="flex px-4 py-2 m-4 bg-slate-700 rounded-xl">
				<h1 class="text-2xl font-bold">litestore</h1>
			</header>
			{props.children}
		</div>
	);
};

export default App;
